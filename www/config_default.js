'use strict';

/*
 * This is the default configuration for iTranswarp.js.
 * 
 * DO NOT change it. Instead, replace value by env. e.g.:
 * 
 * export DOMAIN='www.domain.com'
 * 
 * and the config.domain will be set as $DOMAIN.
 */
module.exports = {
    // server domain name:
    domain: 'www.itranswarp.com',
    // behind a reverse proxy:
    proxy: 'false',
    // the theme used, default to 'default':
    theme: 'default',
    // spider limit: x hits / 10 min, 0 = disabled:
    spider_limit: '10',
    // spider ignore:
    spider_white_list: 'googlebot, mediapartners-google, baiduspider, bingbot, youdaobot, sogou, 360spider',
    // session cookie:
    session_name: 'isession',
    session_salt: 'random-string',
    // cookie expires in seconds:
    session_expires: '604800',
    session_https: 'false',
    // database:
    db_host: 'localhost',
    db_port: '3306',
    db_username: 'root',
    db_password: 'password',
    db_database: 'itranswarp',
    db_max_connections: '10',
    db_min_connections: '1',
    db_max_idle_time: '60',
    db_show_sql: 'false',
    // memcache:
    cache_prefix: 'it/',
    cache_host: 'localhost',
    cache_port: '11211',
    cache_connect_timeout: '1',
    cache_retries: '3',
    // cdn url prefix, e.g. 'http://cdn.example.com/cdn'
    cdn_url_prefix: '',
    // smtp for sending email:
    smtp_host: 'smtp.email.example',
    smtp_port: '465',
    smtp_secure: 'true', // secure:true for port 465, secure:false for port 587
    smtp_from: 'noreply@email.example',
    smtp_username: 'noreply@email.example',
    smtp_password: 'xxx',
    // NOT USED NOW:
    queue_host: '127.0.0.1',
    // port of redis, default to 6379:
    queue_port: '6379',
    // NOT USED NOW:
    search_provider: 'site_search',
    search_site_url: 'https://www.google.com/search?ie=utf-8&q=%s',
    // other search engines:
    // baidu: 'http://www.baidu.com/s?ie=utf-8&wd=%s'
    // bing: 'http://www.bing.com/search?ie=utf-8&q=%s'
    // oauth2 providers that allow sign in from other oauth2 providers:
    oauth2_weibo: 'false',
    oauth2_weibo_icon: 'weibo',
    oauth2_weibo_name: 'Sign in with Weibo',
    oauth2_weibo_app_key: 'xxx',
    oauth2_weibo_app_secret: 'xxx',
    oauth2_qq: 'false',
    oauth2_qq_icon: 'qq',
    oauth2_qq_name: 'Sign in with QQ',
    oauth2_qq_app_key: 'xxx',
    oauth2_qq_app_secret: 'xxx',
    // END:
    end: 'end'
};
