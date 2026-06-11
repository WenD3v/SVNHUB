FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    apache2 \
    apache2-utils \
    curl \
    libapache2-mod-svn \
    subversion \
  && a2enmod dav dav_svn authz authnz_ldap ldap \
  && rm -rf /var/lib/apt/lists/*

COPY apache-svn.conf /etc/apache2/sites-available/000-default.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /var/svn/repos \
  && chown -R www-data:www-data /var/svn/repos

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
