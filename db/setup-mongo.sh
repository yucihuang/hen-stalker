
set -e

mongo <<EOF

use ${DATABASE_NAME}

db.createUser({
  user: '$DATABASE_USERNAME',
  pwd: '$DATABASE_PASSWORD',
  roles: ["readWrite"]
})

EOF