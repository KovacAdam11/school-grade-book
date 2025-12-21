FROM mariadb:lts-jammy

# Set the timezone
ENV TZ="Europe/Bratislava"
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
# SET UTF8 encoding everywhere
COPY utf8.cnf /etc/mysql/mariadb.conf.d/
COPY 50-server.cnf /etc/mysql/mariadb.conf.d/

