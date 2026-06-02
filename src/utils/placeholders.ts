// Inline neutral placeholder. The old via.placeholder.com CDN went down and
// every <img src="https://via.placeholder.com/..."> in the app started
// throwing ERR_CONNECTION_CLOSED. This is a 1x1 light-grey JPEG inline-
// encoded so it works forever with no network call.
//
// Use as the fallback in: src={imageUrl || PLACEHOLDER_IMAGE_URL}

export const PLACEHOLDER_IMAGE_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#E8DFD2"/><text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="14" fill="#9B8E7E" text-anchor="middle" dominant-baseline="middle">No image</text></svg>',
  );
