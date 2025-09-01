$ sudo docker compose build --no-cache
Compose can now delegate builds to bake for better performance.
 To do so, set COMPOSE_BAKE=true.
[+] Building 1238.2s (21/24)                                                                                docker:default
 => => transferring context: 13.57kB                                                                                  0.1s
 => [frontend internal] load .dockerignore                                                                            0.3s
 => => transferring context: 2B                                                                                       0.1s
 => [backend 2/5] COPY wwwhypda-backend/requirements.txt requirements.txt                                             1.2s
 => CACHED [frontend build 1/5] FROM docker.io/library/node:alpine@sha256:be4d5e92ac68483ec71440bf5934865b4b7fcb9358  0.0s
 => [frontend internal] load build context                                                                            0.3s
 => => transferring context: 9.72kB                                                                                   0.2s
 => CACHED [frontend stage-1 1/3] FROM docker.io/library/nginx:stable-alpine                                          0.0s
 => [frontend build 2/5] COPY package.json package.json                                                               1.4s
 => [backend 3/5] RUN pip install -r requirements.txt                                                                56.4s
 => [frontend build 3/5] RUN npm install --omit=dev                                                                1039.0s
 => [backend 4/5] COPY common /common                                                                                 0.7s
 => [backend 5/5] COPY wwwhypda-backend/ .                                                                            1.4s
 => [backend] exporting to image                                                                                      3.0s
 => => exporting layers                                                                                               2.9s
 => => writing image sha256:ad7b545f49ffe3cd5dd5dcb427f24052d3d38d7fd3f22b3eab833a53fa0d6598                          0.0s
 => => naming to docker.io/library/wwwhypda-backend                                                                   0.1s
 => [backend] resolving provenance for metadata file                                                                  0.2s
 => [frontend build 4/5] COPY . .                                                                                     1.2s
 => [frontend build 5/5] RUN npm run build                                                                          191.0s
 => => # > neiro_base@0.1.0 build                                                                                         
 => => # > react-scripts build                                                                                            
 => => # (node:25) [DEP0176] DeprecationWarning: fs.F_OK is deprecated, use fs.constants.F_OK instead                      
 => => # (Use `node --trace-deprecation ...` to show where the warning was created)                                        
 => => # Creating an optimized production build... 