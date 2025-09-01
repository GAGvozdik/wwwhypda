$ sudo docker compose build --no-cache
Compose can now delegate builds to bake for better performance.
 To do so, set COMPOSE_BAKE=true.
[+] Building 99.4s (22/25)                                                                                  docker:default
 => [backend internal] load build definition from Dockerfile                                                          0.3s
 => => transferring dockerfile: 260B                                                                                  0.1s
 => [frontend internal] load build definition from Dockerfile                                                         0.4s
 => => transferring dockerfile: 717B                                                                                  0.1s
 => [backend internal] load metadata for docker.io/library/python:3.11.9-slim                                         1.6s
 => [frontend internal] load metadata for docker.io/library/nginx:stable-alpine                                       0.0s
 => [frontend internal] load metadata for docker.io/library/node:16-alpine                                            1.6s
 => [backend internal] load .dockerignore                                                                             0.2s
 => => transferring context: 2B                                                                                       0.0s
 => [frontend internal] load .dockerignore                                                                            0.3s
 => => transferring context: 2B                                                                                       0.0s
 => CACHED [backend 1/5] FROM docker.io/library/python:3.11.9-slim@sha256:8fb099199b9f2d70342674bd9dbccd3ed03a258f26  0.0s
 => [backend internal] load build context                                                                             0.2s
 => => transferring context: 1.52kB                                                                                   0.0s
 => [frontend builder 1/6] FROM docker.io/library/node:16-alpine@sha256:a1f9d027912b58a7c75be7716c97cfbc6d3099f3a97e  0.0s
 => CACHED [frontend stage-1 1/3] FROM docker.io/library/nginx:stable-alpine                                          0.0s
 => [frontend internal] load build context                                                                            0.3s
 => => transferring context: 8.94kB                                                                                   0.1s
 => [backend 2/5] COPY wwwhypda-backend/requirements.txt requirements.txt                                             1.0s
 => CACHED [frontend builder 2/6] WORKDIR /app                                                                        0.0s
 => [frontend builder 3/6] COPY package*.json ./                                                                      1.1s
 => [frontend stage-1 2/3] COPY nginx.conf /etc/nginx/conf.d/default.conf                                             1.6s
 => [backend 3/5] RUN pip install -r requirements.txt                                                                56.4s
 => ERROR [frontend builder 4/6] RUN npm ci                                                                          93.2s
 => [backend 4/5] COPY common /common                                                                                 2.2s
 => [backend 5/5] COPY wwwhypda-backend/ .                                                                            2.8s
 => [backend] exporting to image                                                                                      5.1s
 => => exporting layers                                                                                               4.5s
 => => writing image sha256:873b33e2b552f35683c9a4ff5adf54fa23c29fe0ec655f0ecd277df74c384a31                          0.1s
 => => naming to docker.io/library/wwwhypda-backend                                                                   0.1s
 => [backend] resolving provenance for metadata file                                                                  0.1s
------
 > [frontend builder 4/6] RUN npm ci:
19.58 npm WARN EBADENGINE Unsupported engine {
19.58 npm WARN EBADENGINE   package: '@jest/diff-sequences@30.0.1',
19.58 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.58 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.58 npm WARN EBADENGINE }
19.60 npm WARN EBADENGINE Unsupported engine {
19.60 npm WARN EBADENGINE   package: '@jest/expect-utils@30.0.5',
19.60 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.60 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.60 npm WARN EBADENGINE }
19.61 npm WARN EBADENGINE Unsupported engine {
19.61 npm WARN EBADENGINE   package: '@jest/get-type@30.0.1',
19.61 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.61 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.61 npm WARN EBADENGINE }
19.61 npm WARN EBADENGINE Unsupported engine {
19.61 npm WARN EBADENGINE   package: '@jest/pattern@30.0.1',
19.61 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.61 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.61 npm WARN EBADENGINE }
19.61 npm WARN EBADENGINE Unsupported engine {
19.61 npm WARN EBADENGINE   package: 'jest-regex-util@30.0.1',
19.61 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.61 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.61 npm WARN EBADENGINE }
19.62 npm WARN EBADENGINE Unsupported engine {
19.62 npm WARN EBADENGINE   package: '@testing-library/dom@10.4.0',
19.62 npm WARN EBADENGINE   required: { node: '>=18' },
19.62 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.62 npm WARN EBADENGINE }
19.62 npm WARN EBADENGINE Unsupported engine {
19.62 npm WARN EBADENGINE   package: '@jest/schemas@30.0.5',
19.62 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.62 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.62 npm WARN EBADENGINE }
19.63 npm WARN EBADENGINE Unsupported engine {
19.63 npm WARN EBADENGINE   package: '@jest/types@30.0.5',
19.63 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.63 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.63 npm WARN EBADENGINE }
19.64 npm WARN EBADENGINE Unsupported engine {
19.64 npm WARN EBADENGINE   package: 'expect@30.0.5',
19.64 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.64 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.64 npm WARN EBADENGINE }
19.64 npm WARN EBADENGINE Unsupported engine {
19.64 npm WARN EBADENGINE   package: 'jest-diff@30.0.5',
19.64 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.64 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.64 npm WARN EBADENGINE }
19.64 npm WARN EBADENGINE Unsupported engine {
19.64 npm WARN EBADENGINE   package: 'jest-matcher-utils@30.0.5',
19.64 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.64 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.64 npm WARN EBADENGINE }
19.64 npm WARN EBADENGINE Unsupported engine {
19.64 npm WARN EBADENGINE   package: 'jest-message-util@30.0.5',
19.64 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.64 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.64 npm WARN EBADENGINE }
19.64 npm WARN EBADENGINE Unsupported engine {
19.64 npm WARN EBADENGINE   package: 'jest-mock@30.0.5',
19.64 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.64 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.64 npm WARN EBADENGINE }
19.64 npm WARN EBADENGINE Unsupported engine {
19.64 npm WARN EBADENGINE   package: 'jest-util@30.0.5',
19.64 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.64 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.64 npm WARN EBADENGINE }
19.64 npm WARN EBADENGINE Unsupported engine {
19.64 npm WARN EBADENGINE   package: 'pretty-format@30.0.5',
19.64 npm WARN EBADENGINE   required: { node: '^18.14.0 || ^20.0.0 || ^22.0.0 || >=24.0.0' },
19.64 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.64 npm WARN EBADENGINE }
19.66 npm WARN EBADENGINE Unsupported engine {
19.66 npm WARN EBADENGINE   package: 'cypress@14.5.4',
19.66 npm WARN EBADENGINE   required: { node: '^18.0.0 || ^20.0.0 || >=22.0.0' },
19.66 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.66 npm WARN EBADENGINE }
19.68 npm WARN EBADENGINE Unsupported engine {
19.68 npm WARN EBADENGINE   package: 'vite@5.4.11',
19.68 npm WARN EBADENGINE   required: { node: '^18.0.0 || >=20.0.0' },
19.69 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.69 npm WARN EBADENGINE }
19.71 npm WARN EBADENGINE Unsupported engine {
19.71 npm WARN EBADENGINE   package: 'rollup@4.27.4',
19.71 npm WARN EBADENGINE   required: { node: '>=18.0.0', npm: '>=8.0.0' },
19.71 npm WARN EBADENGINE   current: { node: 'v16.20.2', npm: '8.19.4' }
19.71 npm WARN EBADENGINE }
69.91 npm WARN deprecated workbox-google-analytics@6.6.0: It is not compatible with newer versions of GA starting with v4, as long as you are using GAv3 it should be ok, but the package is not longer being maintained
70.96 npm WARN deprecated workbox-cacheable-response@6.6.0: workbox-background-sync@6.6.0
72.24 npm WARN deprecated w3c-hr-time@1.0.2: Use your platform's native performance.now() and performance.timeOrigin.
90.73 npm notice 
90.73 npm notice New major version of npm available! 8.19.4 -> 11.5.2
90.73 npm notice Changelog: <https://github.com/npm/cli/releases/tag/v11.5.2>
90.73 npm notice Run `npm install -g npm@11.5.2` to update!
90.73 npm notice 
90.73 npm ERR! code ERR_SOCKET_TIMEOUT
90.73 npm ERR! network Socket timeout
90.73 npm ERR! network This is a problem related to network connectivity.
90.73 npm ERR! network In most cases you are behind a proxy or have bad network settings.
90.73 npm ERR! network 
90.73 npm ERR! network If you are behind a proxy, please make sure that the
90.73 npm ERR! network 'proxy' config is set properly.  See: 'npm help config'
90.90 
90.91 npm ERR! A complete log of this run can be found in:
90.91 npm ERR!     /root/.npm/_logs/2025-09-01T13_16_33_235Z-debug-0.log
------
failed to solve: process "/bin/sh -c npm ci" did not complete successfully: exit code: 1