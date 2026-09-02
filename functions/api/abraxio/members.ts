const ABRAXIO_MEMBERS_URL = 'https://app.abraxio.com/api/management/teams/members/all';

interface PagesContext {
  request: Request;
}

const responseHeaders = (upstream?: Response): Headers => {
  const headers = new Headers({
    'Cache-Control': 'no-store',
  });

  const contentType = upstream?.headers.get('Content-Type');
  const retryAfter = upstream?.headers.get('Retry-After');

  if (contentType) headers.set('Content-Type', contentType);
  if (retryAfter) headers.set('Retry-After', retryAfter);

  return headers;
};

const jsonError = (message: string, status: number): Response =>
  Response.json(
    { message },
    {
      status,
      headers: responseHeaders(),
    },
  );

export const onRequest = async ({ request }: PagesContext): Promise<Response> => {
  if (request.method !== 'GET') {
    return new Response(null, {
      status: 405,
      headers: {
        Allow: 'GET',
        'Cache-Control': 'no-store',
      },
    });
  }

  const authorization = request.headers.get('Authorization');

  if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
    return jsonError('Jeton Abraxio manquant ou invalide.', 401);
  }

  try {
    const upstream = await fetch(ABRAXIO_MEMBERS_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
      },
      redirect: 'manual',
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders(upstream),
    });
  } catch {
    return jsonError("L'API Abraxio est temporairement inaccessible.", 502);
  }
};
