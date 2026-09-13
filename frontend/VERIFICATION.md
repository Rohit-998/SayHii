# Verification

## Passed

- Production `next build --webpack`, all four application routes generated.
- TypeScript strict type check.
- 18 automated tests covering API contracts, auth headers, error handling, cancellation, message ordering/deduplication, and room naming/sorting.
- Dependency audit: no known vulnerabilities at installation.
- Desktop preview at 1440 x 960; mobile preview at 390 x 844; no horizontal overflow.
- Demo sends, sidebar previews, group creation with multiple members, member dialog, mobile navigation, and profile display.
- Login and registration layouts inspected against the supplied forest/glass reference.
- Browser integration fixture: invalid login rejected; valid login stores JWT and loads profile/rooms.
- Browser integration fixture: real SockJS and STOMP clients connected, sent the bearer CONNECT header, and subscribed to the active room topic.
- Browser integration fixture: message SEND destination/payload verified; server echo and incoming messages rendered; duplicate delivery deduplicated.
- Browser integration fixture: history expanded from 50 to 75 messages; scroll anchor shift below one pixel.
- Browser integration fixture: connection loss displays reconnect state; automatic reconnection restores the subscription.
- Browser integration fixture: switching rooms unsubscribes the old topic and clears old-room history.
- Browser integration fixture: authenticated 401 removes the JWT and redirects to login.
- Browser integration fixture: registration accepts an omitted display name, shows confirmation, and does not store a token.
- Mobile opening/viewport resizing preserves bottom anchoring and the composer remains usable.

## Not Verified Against Your Server

The Spring Boot backend was not available in this environment. Browser integration used a deterministic API and network-transport fixture, not a running Spring service. Match the POST routes and DTOs in README.md to your backend, then verify CORS, STOMP authentication, authorization, message persistence, and presence with multiple real accounts.

The HTML preview runs the same React UI but uses hash navigation. Next.js routing was build-checked; the preview is not a hosted Next.js deployment.
