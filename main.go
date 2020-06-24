package main

import (
	"encoding/json"
	"fmt"
	"gopkg.in/go-playground/validator.v9"
	"gopkg.in/yaml.v2"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"time"
)

type Site struct {
	Path    string `validate:"required" json:"path" yaml:"path"`
	BaseUri string `validate:"required" json:"baseUri" yaml:"baseUri"`
}

type RequestPayload struct {
	AuthHeader  string     `json:"authHeader"`
	Site        Site       `json:"site"`
	ExportId    string     `json:"exportId"`
	QueryParams url.Values `json:"queryParams"`
}

func requestHandler(resp http.ResponseWriter, req *http.Request) {
	log.Printf("%s %s %s", req.RemoteAddr, req.Method, req.URL)

	// Parse path.
	urlParts := strings.Split(req.URL.Path, "/")
	if len(urlParts) == 1 {
		http.Error(resp, "Missing Site id from url path", 404)
		return
	}
	if len(urlParts) == 2 {
		http.Error(resp, "Missing export id from url path", 404)
		return
	}
	if len(urlParts) == 3 {
		http.Error(resp, "Missing filename from url path", 404)
		return
	}
	if len(urlParts) != 4 {
		http.NotFound(resp, req)
		return
	}
	siteId := urlParts[1]
	exportId := urlParts[2]
	fileName := urlParts[3]

	// Read config.
	configRaw, err := ioutil.ReadFile("/app/config.yml")
	if err != nil {
		log.Printf("Error: %v", err)
		http.Error(resp, "Cannot read site config file", 500)
		return
	}
	config := make(map[string]*Site)
	if err := yaml.Unmarshal(configRaw, &config); err != nil {
		log.Printf("Error: %v", err)
		http.Error(resp, "Site config yaml error", 500)
		return
	}

	// Check config.
	site, ok := config[siteId]
	if !ok {
		http.Error(resp, fmt.Sprintf("Unknown Site: %s", siteId), 400)
		return
	}
	v := validator.New()
	if err := v.Struct(site); err != nil {
		log.Printf("Invalid config: %v", err)
		http.Error(resp, "Site config is invalid", 500)
		return
	}

	// Try and get auth from header, then from request body.
	authHeader := req.Header.Get("Authorization")
	if authHeader == "" && req.Method == "POST" {
		if req.Header.Get("Content-Type") != "application/json" {
			http.Error(resp, "application/json is required", 400)
			return
		}
		var data map[string]string
		if err := json.NewDecoder(req.Body).Decode(&data); err != nil {
			http.Error(resp, fmt.Sprintf("Invalid json in request body: %v", err), 400)
			return
		}
		val, ok := data["authToken"]
		if ok {
			authHeader = fmt.Sprintf("Bearer %s", val)
		}
	}

	// Build the payload to pass to deno handler.
	payload := &RequestPayload{
		AuthHeader:  authHeader,
		Site:        *site,
		ExportId:    exportId,
		QueryParams: req.URL.Query(),
	}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Error encoding JSON: %v", err)
		http.Error(resp, "An unexpected error occurred", 500)
		return
	}
	log.Println(string(jsonPayload))

	// Run the handler script.
	cmd := exec.CommandContext(
		req.Context(),
		"deno",
		"run",
		"--allow-read",
		"--allow-net",
		"/app/handle_request.ts",
		string(jsonPayload),
	)
	stdOut, err := cmd.StdoutPipe()
	cmd.Stderr = os.Stderr
	if err := cmd.Start(); err != nil {
		log.Printf("Error running handler %v", err)
		http.Error(resp, "An unexpected error occurred", 500)
		return
	}

	// Start sending response.
	resp.Header().Set("Content-Type", "text/csv; charset=utf-8")
	resp.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	if _, err := io.Copy(resp, stdOut); err != nil {
		log.Printf("Error copying stdout %v", err)
		return
	}
	// NOTE: From this point, we cannot change headers or return errors.

	// Wait for the command to finish.
	if err := cmd.Wait(); err != nil {
		log.Printf("Handler command failed: %v", err)
		return
	}

	log.Println("Export completed successfully 👍")
}

func main() {
	log.Println("Starting HTTP Server")
	srv := &http.Server{
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Minute,
		Addr:         ":80",
	}
	http.HandleFunc("/", requestHandler)
	log.Fatal(srv.ListenAndServe())
}