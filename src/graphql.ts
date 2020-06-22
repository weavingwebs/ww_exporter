interface GraphqlResponse<T> {
  data: T;
  extensions?: Array<{
    message: string;
  }>;
  errors?: Array<{
    message: string;
  }>;
}

export const graphql = async <TQueryResponse, TQueryVariables = undefined>(
  uri: string,
  authHeader: string|null,
  query: string,
  variables?: TQueryVariables,
) => {
  const headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });
  if (authHeader) {
    headers.set('Authorization', authHeader);
  }
  const resp = await fetch(uri, {
    method: 'POST',
    headers,
    body: JSON.stringify({query, variables}),
  });

  // Check we got JSON.
  if (resp.headers.get('Content-Type') !== 'application/json') {
    if (resp.ok) {
      throw new Error(`Invalid content type from ${uri} (200)`);
    }
    throw new Error(`Error ${resp.status} from ${uri}`);
  }

  // Check for error.
  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`Error ${resp.status} from ${uri}: ${error}`);
  }

  // Decode json.
  const data: GraphqlResponse<TQueryResponse> = await resp.json();

  // Check for Apollo Server style errors.
  if (typeof data.errors !== 'undefined') {
    const err = data.errors.map(({ message }) => message).join(', ');
    throw new Error(err);
  }
  if (typeof data.extensions !== 'undefined') {
    const err = data.extensions.map(({ message }) => message).join(', ');
    throw new Error(err);
  }
  if (typeof data.data === 'undefined') {
    throw new Error('no data returned');
  }
  return data.data;
};
