export function buildComposeYml(params: { containerPrefix: string }) {
  const { containerPrefix } = params;

  // IMPORTANT:
  // We are NOT using a template string with ${VAR} directly.
  // We keep ${VAR} literally by writing it as plain text.
  const compose =
`services:
  backend:
    image: node:20
    container_name: ${containerPrefix}_backend
    working_dir: /app
    restart: unless-stopped

    env_file:
      - .env

    environment:
      PORT: 4000
      DB_HOST: db
      DB_PORT: 5432

    ports:
      - \${BACKEND_PORT}:4000

    volumes:
      - ./backend:/app

    command: sh -c "npm install && npx prisma generate && npx prisma db push && npm run dev"




    depends_on:
      - db

    networks:
      - startup_net



  db:
    image: postgres:16
    container_name: ${containerPrefix}_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: \${POSTGRES_USER}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    ports:
      - "\${DB_PORT}:5432"
    volumes:
      - db_data_${containerPrefix}:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - startup_net

  n8n:
    build:
      context: ./docker/n8n
    container_name: ${containerPrefix}_n8n
    restart: unless-stopped
    ports:
      - "\${N8N_PORT}:5678"
    environment:
      - NODE_ENV=production
      - GENERIC_TIMEZONE=Asia/Kolkata
      - N8N_COMMUNITY_PACKAGES_ENABLED=true

      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=db
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=\${POSTGRES_DB_N8N}
      - DB_POSTGRESDB_USER=\${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=\${POSTGRES_PASSWORD}
      - PLATFORM_API_URL=http://host.docker.internal:5050
      - OLLAMA_URL=http://host.docker.internal:11434/api/generate

      - N8N_USER_MANAGEMENT_DISABLED=\${N8N_USER_MANAGEMENT_DISABLED}

   
      - N8N_BASIC_AUTH_ACTIVE=\${N8N_BASIC_AUTH_ACTIVE}
      - N8N_BASIC_AUTH_USER=\${N8N_BASIC_AUTH_USER}
      - N8N_BASIC_AUTH_PASSWORD=\${N8N_BASIC_AUTH_PASSWORD}

      - N8N_DIAGNOSTICS_ENABLED=\${N8N_DIAGNOSTICS_ENABLED}
      - N8N_PERSONALIZATION_ENABLED=\${N8N_PERSONALIZATION_ENABLED}
      - N8N_API_KEY=\${N8N_API_KEY}
      - N8N_PUBLIC_API_DISABLED=\${N8N_PUBLIC_API_DISABLED}

      
      - N8N_RUNNERS_ENABLED=true
      - DB_SQLITE_POOL_SIZE=2
      - N8N_BLOCK_ENV_ACCESS_IN_NODE=false
      - N8N_GIT_NODE_DISABLE_BARE_REPOS=true

    volumes:
      - n8n_data_${containerPrefix}:/home/node/.n8n
    networks:
      - startup_net


  web:
    image: node:20
    container_name: ${containerPrefix}_web
    working_dir: /app
    restart: unless-stopped
    ports:
      - "\${WEB_PORT}:3000"
    environment:
    - PORT=3000
    - DB_HOST=db
    - DB_PORT=5432
    - DB_USER=\${POSTGRES_USER}
    - DB_PASS=\${POSTGRES_PASSWORD}
    - DB_NAME=\${POSTGRES_DB}
    - BACKEND_URL=http://backend:4000
    volumes:
      - ./web:/app
    command: sh -c "npm install && npm run dev -- --hostname 0.0.0.0"
    depends_on:
      - db
    networks:
      - startup_net

volumes:
  db_data_${containerPrefix}:
  n8n_data_${containerPrefix}:

networks:
  startup_net:
    driver: bridge
`;
  return compose;
}
