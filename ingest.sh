#!/bin/bash

# ingest.sh: Ingests and processes documentation from the netdata/netdata and
# netdata/go.d.plugin repositories.

HOME=$PWD
TMP_DIR="$PWD/ingest/"
GO_DIR="${TMP_DIR}collectors/go.d.plugin"
DOCS_DIR="$PWD/docs/"

REPO_CORE="https://github.com/joelhans/netdata.git"
BRANCH_CORE="frontmatter"

# Check if ingest directory already exists. If it doesn't, clone the core repo
# from the repo and branch specified above. That would usually be
# https://github.com/netdata/netdata.git and master, but we may need to change
# it on occassion. If the repo exists, just pull the repo instead of cloning it
# again.
echo "Ingest and/or sync with Netdata repositories."
if [ ! -d ${TMP_DIR} ]
then
  git clone -b ${BRANCH_CORE} ${REPO_CORE} ${TMP_DIR}  
else
  cd ${TMP_DIR}
  git pull origin ${BRANCH_CORE}
  cd ${HOME}
fi

# Check if the go.d.plugin directory exists. Same logic as above.
if [ ! -d ${GO_DIR} ]
then
  git clone https://github.com/netdata/go.d.plugin.git ${GO_DIR}  
else
  cd ${GO_DIR}
  git pull origin master
  cd ${HOME}
fi

# Sync .md files from ingest directory to documentation directory.
echo "Sync .md files from ingest directory to documentation directory."
rsync -a \
  --exclude=".github/" --exclude=".travis/" \
  --exclude="HISTORICAL_CHANGELOG.md" --exclude="DOCUMENTATION.md" \
  --exclude="contrib/sles11/README.md" \
  --include="*/" --include="*.md" \
  --exclude="*" \
  --prune-empty-dirs \
  --delete --delete-excluded \
  ${TMP_DIR} ${DOCS_DIR}

# Strip comments around frontmatter.
echo "Strip comments around frontmatter and GA tags."
find ${DOCS_DIR} -name '*.md' -exec sed -i '/<!--/d;/-->/d;/\[!\[analytics\].*\(\<\>\)/d' {} \;

# Strip h1 (#) elements.
# This can only be uncommented when frontmatter is put into place.
# echo "Strip h1 (#) elements."
# find ${DOCS_DIR} -name "*.md" -exec sed -i '/^#.*/d' {} \;

echo "Done ingesting."