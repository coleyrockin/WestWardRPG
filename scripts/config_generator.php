<?php
/**
 * Configuration Generator for WestWard RPG
 * Generates web server configuration files for deployment
 */

class ConfigGenerator {
    private $projectRoot;
    private $config;
    
    public function __construct($projectRoot) {
        $this->projectRoot = realpath($projectRoot);
        $this->config = [
            'server_name' => 'westward.local',
            'port' => 8080,
            'root_dir' => $this->projectRoot,
            'index_files' => ['index.html'],
            'mime_types' => [
                'html' => 'text/html',
                'js' => 'application/javascript',
                'json' => 'application/json',
                'css' => 'text/css',
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'svg' => 'image/svg+xml',
            ]
        ];
    }
    
    public function setServerName($name) {
        $this->config['server_name'] = $name;
        return $this;
    }
    
    public function setPort($port) {
        $this->config['port'] = intval($port);
        return $this;
    }
    
    public function generateNginxConfig() {
        $config = <<<NGINX
server {
    listen {$this->config['port']};
    server_name {$this->config['server_name']};
    
    root {$this->config['root_dir']};
    index {$this->joinArray($this->config['index_files'])};
    
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # JavaScript files
    location ~* \.js$ {
        types { application/javascript js; }
        expires 1d;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # JSON files
    location ~* \.json$ {
        types { application/json json; }
        expires 1h;
    }
    
    # HTML files
    location ~* \.html$ {
        types { text/html html; }
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # Static assets
    location ~* \.(css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX;
        
        return $config;
    }
    
    public function generateApacheConfig() {
        $config = <<<APACHE
<VirtualHost *:{$this->config['port']}>
    ServerName {$this->config['server_name']}
    DocumentRoot {$this->config['root_dir']}
    
    <Directory {$this->config['root_dir']}>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Enable URL rewriting
        RewriteEngine On
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule ^(.*)$ /index.html [L,QSA]
    </Directory>
    
    # Cache control for static assets
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
        Header set Cache-Control "max-age=604800, public"
    </FilesMatch>
    
    <FilesMatch "\.(html|json)$">
        Header set Cache-Control "max-age=3600, public, must-revalidate"
    </FilesMatch>
    
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    
    ErrorLog \${APACHE_LOG_DIR}/westward-error.log
    CustomLog \${APACHE_LOG_DIR}/westward-access.log combined
</VirtualHost>
APACHE;
        
        return $config;
    }
    
    public function generateCaddyConfig() {
        $config = <<<CADDY
{$this->config['server_name']}:{$this->config['port']} {
    root * {$this->config['root_dir']}
    
    encode gzip
    
    try_files {path} /index.html
    file_server
    
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
    }
    
    @static {
        path *.js *.css *.png *.jpg *.jpeg *.gif *.ico *.svg
    }
    header @static Cache-Control "max-age=604800, public"
    
    @markup {
        path *.html *.json
    }
    header @markup Cache-Control "max-age=3600, public, must-revalidate"
}
CADDY;
        
        return $config;
    }
    
    private function joinArray($arr) {
        return implode(' ', $arr);
    }
    
    public function saveConfig($type, $filename) {
        $content = '';
        
        switch (strtolower($type)) {
            case 'nginx':
                $content = $this->generateNginxConfig();
                break;
            case 'apache':
                $content = $this->generateApacheConfig();
                break;
            case 'caddy':
                $content = $this->generateCaddyConfig();
                break;
            default:
                throw new Exception("Unknown server type: $type");
        }
        
        if (file_put_contents($filename, $content) === false) {
            throw new Exception("Failed to write to file: $filename");
        }
        
        return $filename;
    }
}

// CLI execution
if (php_sapi_name() === 'cli') {
    $options = getopt('t:o:s:p:h', ['type:', 'output:', 'server:', 'port:', 'help']);
    
    if (isset($options['h']) || isset($options['help'])) {
        echo "Usage: php config_generator.php [options]\n";
        echo "Options:\n";
        echo "  -t, --type <nginx|apache|caddy>  Server type (default: nginx)\n";
        echo "  -o, --output <file>               Output file (default: stdout)\n";
        echo "  -s, --server <name>               Server name (default: westward.local)\n";
        echo "  -p, --port <port>                 Port number (default: 8080)\n";
        echo "  -h, --help                        Show this help\n";
        exit(0);
    }
    
    $projectRoot = dirname(__DIR__);
    $generator = new ConfigGenerator($projectRoot);
    
    $type = $options['t'] ?? $options['type'] ?? 'nginx';
    $output = $options['o'] ?? $options['output'] ?? null;
    $server = $options['s'] ?? $options['server'] ?? null;
    $port = $options['p'] ?? $options['port'] ?? null;
    
    if ($server) {
        $generator->setServerName($server);
    }
    
    if ($port) {
        $generator->setPort($port);
    }
    
    try {
        if ($output) {
            $generator->saveConfig($type, $output);
            echo "Configuration saved to: $output\n";
        } else {
            switch ($type) {
                case 'nginx':
                    echo $generator->generateNginxConfig();
                    break;
                case 'apache':
                    echo $generator->generateApacheConfig();
                    break;
                case 'caddy':
                    echo $generator->generateCaddyConfig();
                    break;
            }
        }
    } catch (Exception $e) {
        fwrite(STDERR, "Error: " . $e->getMessage() . "\n");
        exit(1);
    }
}
