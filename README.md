# Element Call

[![Chat](https://img.shields.io/matrix/webrtc:matrix.org)](https://matrix.to/#/#webrtc:matrix.org)
[![Localazy](https://img.shields.io/endpoint?url=https%3A%2F%2Fconnect.localazy.com%2Fstatus%2Felement-call%2Fdata%3Fcontent%3Dall%26title%3Dlocalazy%26logo%3Dtrue)](https://localazy.com/p/element-call)

Group calls with WebRTC that leverage [Matrix](https://matrix.org) and an
open-source WebRTC toolkit from [LiveKit](https://livekit.io/).

For prior version of the Element Call that relied solely on full-mesh logic,
check [`full-mesh`](https://github.com/element-hq/element-call/tree/full-mesh)
branch.

![A demo of Element Call with six people](demo.jpg)

To try it out, visit our hosted version at
[call.element.io](https://call.element.io). You can also find the latest
development version continuously deployed to
[call.element.dev](https://call.element.dev/).

## Host it yourself

Until prebuilt tarballs are available, you'll need to build Element Call from
source. First, clone and install the package:

```
git clone https://github.com/element-hq/element-call.git
cd element-call
yarn
yarn build
```

If all went well, you can now find the build output under `dist` as a series of
static files. These can be hosted using any web server that can be configured
with custom routes (see below).

You may also wish to add a configuration file (Element Call uses the domain it's
hosted on as a Homeserver URL by default, but you can change this in the config
file). This goes in `public/config.json` - you can use the sample as a starting
point:

```
cp config/config.sample.json public/config.json
# edit public/config.json
```

Because Element Call uses client-side routing, your server must be able to route
any requests to non-existing paths back to `/index.html`. For example, in Nginx
you can achieve this with the `try_files` directive:

```
server {
    ...
    location / {
        ...
        try_files $uri /$uri /index.html;
    }
}
```

By default, the app expects you to have a Matrix homeserver (such as
[Synapse](https://element-hq.github.io/synapse/latest/setup/installation.html))
installed locally and running on port 8008. If you wish to use a homeserver on a
different URL or one that is hosted on a different server, you can add a config
file as above, and include the homeserver URL that you'd like to use.

Element Call requires a homeserver with registration enabled without any 3pid or
token requirements, if you want it to be used by unregistered users.
Furthermore, it is not recommended to use it with an existing homeserver where
user accounts have joined normal rooms, as it may not be able to handle those
yet and it may behave unreliably.

Therefore, to use a self-hosted homeserver, this is recommended to be a new
server where any user account created has not joined any normal rooms anywhere
in the Matrix federated network. The homeserver used can be setup to disable
federation, so as to prevent spam registrations (if you keep registrations open)
and to ensure Element Call continues to work in case any user decides to log in
to their Element Call account using the standard Element app and joins normal
rooms that Element Call cannot handle.

## Configuration

There are currently two different config files. `.env` holds variables that are
used at build time, while `public/config.json` holds variables that are used at
runtime. Documentation and default values for `public/config.json` can be found
in [ConfigOptions.ts](src/config/ConfigOptions.ts).

If you're using [Synapse](https://github.com/element-hq/synapse/), you'll need
to additionally add the following to `homeserver.yaml` or Element Call won't
work:

```
experimental_features:
    # MSC3266: Room summary API. Used for knocking over federation
    msc3266_enabled: true
    # MSC4222 needed for syncv2 state_after. This allow clients to
    # correctly track the state of the room.
    msc4222_enabled: true

# The maximum allowed duration by which sent events can be delayed, as
# per MSC4140.
max_event_delay_duration: 24h

rc_message:
  # This needs to match at least the heart-beat frequency plus a bit of headroom
  # Currently the heart-beat is every 5 seconds which translates into a rate of 0.2s
  per_second: 0.5
  burst_count: 30
```

MSC3266 allows to request a room summary of rooms you are not joined. The
summary contains the room join rules. We need that to decide if the user gets
prompted with the option to knock ("Request to join call"), a cannot join error or the
join view.

MSC4222 allow clients to opt-in to a change of the sync v2 API that allows them
to correctly track the state of the room. This is required by Element Call to
track room state reliably.

Element Call requires a Livekit SFU alongside a [Livekit JWT
service](https://github.com/element-hq/lk-jwt-service) to work. The url to the
Livekit JWT service can either be configured in the config of Element Call
(fallback/legacy configuration) or be configured by your homeserver via the
`.well-known/matrix/client`. This is the recommended method.

The configuration is a list of Foci configs:

```json
"org.matrix.msc4143.rtc_foci": [
    {
        "type": "livekit",
        "livekit_service_url": "https://someurl.com"
    },
     {
        "type": "livekit",
        "livekit_service_url": "https://livekit2.com"
    },
    {
        "type": "another_foci",
        "props_for_another_foci": "val"
    },
]
```

## Translation

If you'd like to help translate Element Call, head over to
[Localazy](https://localazy.com/p/element-call). You're also encouraged to join
the [Element Translators](https://matrix.to/#/#translators:element.io) space to
discuss and coordinate translation efforts.

## Development

### Frontend

Element Call is built against
[matrix-js-sdk](https://github.com/matrix-org/matrix-js-sdk/pull/2553). To get
started, clone, install, and link the package:

```
git clone https://github.com/matrix-org/matrix-js-sdk.git
cd matrix-js-sdk
yarn
yarn link
```

Next, we can set up this project:

```
git clone https://github.com/element-hq/element-call.git
cd element-call
yarn
yarn link matrix-js-sdk
```

To use it, create a local config by, e.g., `cp ./config/config.devenv.json
./public/config.json` and adapt it if necessary. The `config.devenv.json` config
should work with the backend development environment as outlined in the next
section out of box.

(Be aware, that this `config.devenv.json` is exposing a deprecated fallback
LiveKit config key. If the homeserver advertises SFU backend via
`.well-known/matrix/client` this has precedence.)

You're now ready to launch the development server:

```
yarn dev
```

### Backend

A docker compose file `dev-backend-docker-compose.yml` is provided to start the
whole stack of components which is required for a local development environment:

- Minimum Synapse Setup (servername: synapse.localhost)
- LiveKit JWT Service (Note requires Federation API and hence a TLS reverse proxy)
- Minimum TLS reverse proxy (servername: synapse.localhost) Note certificates
  are valid for at least 10 years from now
- Minimum LiveKit SFU Setup using dev defaults for config
- Redis db for completness

These use a test 'secret' published in this repository, so this must be used
only for local development and **_never be exposed to the public Internet._**

Run backend components:

```
yarn backend
# or  for podman-compose
# podman-compose -f dev-backend-docker-compose.yml up
```

### Test Coverage

<img src="https://codecov.io/github/element-hq/element-call/graphs/tree.svg?token=O6CFVKK6I1"></img>

### Add a new translation key

To add a new translation key you can do these steps:

1. Add the new key entry to the code where the new key is used: `t("some_new_key")`
1. Run `yarn i18n` to extract the new key and update the translation files. This
   will add a skeleton entry to the `locales/en/app.json` file:
   ```jsonc
   {
       ...
       "some_new_key": "",
       ...
   }
   ```
1. Update the skeleton entry in the `locales/en/app.json` file with
   the English translation:

```jsonc
   {
       ...
       "some_new_key": "Some new key",
       ...
   }
```

## Documentation

Usage and other technical details about the project can be found here:

[**Docs**](./docs/README.md)

## Copyright & License

Copyright 2021-2025 New Vector Ltd

This software is dual-licensed by New Vector Ltd (Element). It can be used either:

(1) for free under the terms of the GNU Affero General Public License (as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version); OR

(2) under the terms of a paid-for Element Commercial License agreement between you and Element (the terms of which may vary depending on what you and Element have agreed to).
Unless required by applicable law or agreed to in writing, software distributed under the Licenses is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the Licenses for the specific language governing permissions and limitations under the Licenses.
