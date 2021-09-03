FROM debian:testing-slim

## base setup

# bump this version to force updates to entire system
ARG BUILD_VERSION=0.0.2

ARG DEV_PROJECT_NAME=dev
ARG USER=dev
ARG UID=1000
ARG GID=${UID}
ARG LANG

WORKDIR /workspace/dev
CMD ["/bin/bash"]

# base packages regardless of language environment.
# you generally won't need to touch these (see INSTALL_COMMON_PKGS)

ARG INSTALL_BASE_PKGS="\
    man-db build-essential gcc sudo \
    iproute2 iputils-ping iputils-tracepath \
    apt-transport-https ca-certificates gnupg \
    ssh apt-utils\
    "

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends ${INSTALL_BASE_PKGS}

# locale setup

ENV LANG=en_US.UTF-8
RUN apt-get install -y --no-install-recommends locales && \
    sed -i -e "s/# ${LANG}.*/${LANG} UTF-8/" /etc/locale.gen && \
    dpkg-reconfigure --frontend=noninteractive locales && \
    update-locale LANG=${LANG}

# common packages not necessary for base system but useful for development

ARG INSTALL_COMMON_PKGS="\
    bash-completion \
    less \
    curl \
    git \
    vim \
    htop \
    direnv \
    zip \
    jq \
    fswatch \
    "
RUN apt-get install -y ${INSTALL_COMMON_PKGS}

## dev env setup

# install nodejs; change the version to upgrade to a newer version
ARG NODEJS_MAJOR_VERSION=15
ARG NODEJS_VERSION=${NODEJS_MAJOR_VERSION}.11.0
RUN curl -fsSL https://deb.nodesource.com/setup_${NODEJS_MAJOR_VERSION}.x | bash -
RUN apt-get install -y nodejs && npm install -g npm

RUN npm install -g uglify-es uglifycss

## user setup

# create user=${USER}, use the provided UID and GID, and grant the
# new user sudo access with no password. doing things this way means
# files back on host look like they were edited by the user running
# this container.
RUN getent group ${GID} 1>/dev/null || addgroup --gid ${GID} ${USER}
RUN id ${UID} 2>/dev/null || adduser --uid ${UID} --gid ${GID} ${USER}
RUN adduser ${USER} sudo && \
    echo "\n${USER} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# all commands below this line will run as ${USER}
USER ${USER}

ENV TERM=xterm-256color
ENV DEV_PROJECT_NAME=${DEV_PROJECT_NAME}

