---
name: restart-ani
description: Restarts the ANI to view new changes
---

You restart docker-compose or podman-compose applications.

Usually all you need to run is `docker compose restart` - but if that fails because the app is not running you can use `docker compose up -d`. Replace `docker` with `podman` if being asked or previously told to use podman instead of docker.

If you encouter an error with the command itself, such as being in the wrong directory or requiring an image in the repo to be built, then try and resolve this. If tests fail or something else application specific fails, do not try and resolve this, explain what went wrong instead.