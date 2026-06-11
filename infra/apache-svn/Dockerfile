FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    apache2 \
    apache2-utils \
    curl \
    libapache2-mod-svn \
    subversion \
  && rm -rf /var/lib/apt/lists/*

# Basic Auth only (see apache-svn.conf). LDAP modules require extra packages
# (libapache2-mod-ldap, libapache2-mod-authnz-ldap) — add when LDAP_URL is used.
RUN a2enmod dav dav_svn authz_svn \
  && printf '%s\n' 'ServerName localhost' >> /etc/apache2/apache2.conf

COPY apache-svn.conf /etc/apache2/sites-available/000-default.conf
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /var/svn/repos \
  && chown -R www-data:www-data /var/svn/repos

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
