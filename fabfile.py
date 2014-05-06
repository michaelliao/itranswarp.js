#!/usr/bin/env python
# -*- coding: utf-8 -*-

__author__ = 'Michael Liao'

'''
Build release package.
'''

import os

from datetime import datetime
from fabric.api import *

env.user = 'root'
env.hosts = ['www.liaoxuefeng.com']

db_user = 'www'
db_password = 'www'

_TAR_FILE = 'itranswarp.tar.gz'

_REMOTE_TMP_TAR = '/tmp/%s' % _TAR_FILE

_REMOTE_BASE_DIR = '/srv/itranswarp'

_DIST_DIR = 'www-%s' % datetime.now().strftime('%y-%m-%d_%H.%M.%S')

def _current_path():
    return os.path.abspath('.')

##########
# backup #
##########

def backup():
    dt = datetime.now().strftime('%y-%m-%d_%H.%M.%S')
    f = 'backup-%s.sql' % dt
    with cd('/tmp'):
        run('mysqldump --user=%s --password=%s --skip-opt --add-drop-table --default-character-set=utf8 --quick itranswarp > %s' % (db_user, db_password, f))
        run('tar -czvf %s.tar.gz %s' % (f, f))
        get('%s.tar.gz' % f, '%s/backup/' % _current_path())
        run('rm -f %s' % f)
        run('rm -f %s.tar.gz' % f)

def build():
    includes = ['controllers', 'models', 'node_modules', 'static', 'views', '*.js', 'favicon.ico']
    excludes = ['gulpfile.js', 'schema.js', '.*', '*.py', '*.pyc', '*.pyo', '*.psd', 'static/css/*.less']
    local('rm -f %s' % _TAR_FILE)
    cmd = ['tar', '--dereference', '-czvf', 'dist/%s' % _TAR_FILE]
    cmd.extend(['--exclude=\'%s\'' % ex for ex in excludes])
    cmd.extend(includes)
    local(' '.join(cmd))

def scp():
    run('rm -f %s' % _REMOTE_TMP_TAR)
    put('dist/%s' % _TAR_FILE, _REMOTE_TMP_TAR)
    with cd(_REMOTE_BASE_DIR):
        run('mkdir -p log')
        run('mkdir %s' % _DIST_DIR)
    with cd('%s/%s' % (_REMOTE_BASE_DIR, _DIST_DIR)):
        run('tar -xzvf %s' % _REMOTE_TMP_TAR)
    with cd(_REMOTE_BASE_DIR):
        run('chown -R www-data:www-data %s' % _DIST_DIR)
        run('rm -f www')
        run('ln -s %s www' % _DIST_DIR)
        run('chown www-data:www-data www')
    with settings(warn_only=True):
        run('supervisorctl stop itranswarp')
        run('supervisorctl start itranswarp')

def make():
    build()
    scp()
