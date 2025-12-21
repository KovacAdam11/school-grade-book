FROM node:22 AS node
FROM ubuntu:latest

# nodejs
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm

WORKDIR /opt/app

# Skopirovat startovaci skript
COPY start.sh /root/start.sh

ENTRYPOINT ["/bin/bash"]
CMD ["/root/start.sh"]

