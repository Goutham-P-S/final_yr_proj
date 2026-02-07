export function buildComposeYml(params: { containerPrefix: string }) {
  const { containerPrefix } = params;

  // IMPORTANT:
  // We are NOT using a template string with ${VAR} directly.
  // We keep ${VAR} literally by writing it as plain text.
  const compose =
`services:
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
      - db_data:/var/lib/postgresql/data
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
      - DB_POSTGRESDB_DATABASE=\${POSTGRES_DB}
      - DB_POSTGRESDB_USER=\${POSTGRES_USER}
      - DB_POSTGRESDB_PASSWORD=\${POSTGRES_PASSWORD}


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
      - n8n_data:/home/node/.n8n
    networks:
      - startup_net


  web:
    image: node:20-alpine
    container_name: ${containerPrefix}_web
    working_dir: /app
    restart: unless-stopped
    ports:
      - "\${WEB_PORT}:3000"
    environment:
      - PORT=3000
    volumes:
      - ./web:/app
    command: sh -c "npm install && npm run dev -- --hostname 0.0.0.0"
    depends_on:
      - db
    networks:
      - startup_net

volumes:
  db_data:
  n8n_data:

networks:
  startup_net:
    driver: bridge
`;
  return compose;
}
