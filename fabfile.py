#!/usr/bin/env python
# -*- coding: utf-8 -*-

__author__ = 'Michael Liao'

'''
Build release package.
'''

import os, re

from datetime import datetime
from fabric.api import *

env.user = 'root'
env.hosts = ['www.liaoxuefeng.com']

db_user = 'www'
db_password = 'www'

_TAR_FILE = 'dist-itranswarp.tar.gz'

_REMOTE_TMP_TAR = '/tmp/%s' % _TAR_FILE

_REMOTE_BASE_DIR = '/srv/itranswarp'

def _current_path():
    return os.path.abspath('.')

def _now():
    return datetime.now().strftime('%y-%m-%d_%H.%M.%S')

##########
# backup #
##########

def backup():
    dt = _now()
    f = 'backup-itranswarp-%s.sql' % dt
    with cd('/tmp'):
        run('mysqldump --user=%s --password=%s --skip-opt --add-drop-table --default-character-set=utf8 --quick itranswarp > %s' % (db_user, db_password, f))
        run('tar -czvf %s.tar.gz %s' % (f, f))
        get('%s.tar.gz' % f, '%s/backup/' % _current_path())
        run('rm -f %s' % f)
        run('rm -f %s.tar.gz' % f)

def build():
    includes = ['controllers', 'models', 'node_modules', 'static', 'views', '*.js', 'favicon.ico']
    excludes = ['gulpfile.js', 'schema.js', '.*', '*.py', '*.pyc', '*.pyo', '*.psd', 'static/css/*.less']
    local('rm -f dist/%s' % _TAR_FILE)
    cmd = ['tar', '--dereference', '-czvf', 'dist/%s' % _TAR_FILE]
    cmd.extend(['--exclude=\'%s\'' % ex for ex in excludes])
    cmd.extend(includes)
    local(' '.join(cmd))

def scp():
    newdir = 'www-%s' % _now()
    run('rm -f %s' % _REMOTE_TMP_TAR)
    put('dist/%s' % _TAR_FILE, _REMOTE_TMP_TAR)
    with cd(_REMOTE_BASE_DIR):
        run('mkdir %s' % newdir)
    with cd('%s/%s' % (_REMOTE_BASE_DIR, newdir)):
         run('tar -xzvf %s' % _REMOTE_TMP_TAR)
    with cd(_REMOTE_BASE_DIR):
         run('rm -f www')
         run('ln -s %s www' % newdir)
         run('chown www-data:www-data www')
         run('chown -R www-data:www-data %s' % newdir)
    with settings(warn_only=True):
         run('supervisorctl stop itranswarp')
         run('supervisorctl start itranswarp')
         run('/etc/init.d/nginx reload')

RE_FILES = re.compile('\r?\n')

def rollback():
    ' rollback to previous version '
    with cd(_REMOTE_BASE_DIR):
        r = run('ls -p -1')
        files = [s[:-1] for s in RE_FILES.split(r) if s.startswith('www-') and s.endswith('/')]
        files.sort(cmp=lambda s1, s2: 1 if s1 < s2 else -1)
        r = run('ls -l www')
        ss = r.split(' -> ')
        if len(ss) != 2:
            print ('ERROR: \'www\' is not a symbol link.')
            return
        current = ss[1]
        print ('Found current symbol link points to: %s\n' % current)
        try:
            index = files.index(current)
        except ValueError, e:
            print ('ERROR: symbol link is invalid.')
            return
        if len(files) == index + 1:
            print ('ERROR: already the oldest version.')
        old = files[index + 1]
        print ('==================================================')
        for f in files:
            if f == current:
                print ('      Current ---> %s' % current)
            elif f == old:
                print ('  Rollback to ---> %s' % old)
            else:
                print ('                   %s' % f)
        print ('==================================================')
        print ('')
        yn = raw_input ('continue? y/N ')
        if yn != 'y' and yn != 'Y':
            print ('Rollback cancelled.')
            return
        print ('Start rollback...')
        run('rm -f www')
        run('ln -s %s www' % old)
        run('chown www-data:www-data www')
        with settings(warn_only=True):
            run('supervisorctl stop itranswarp')
            run('supervisorctl start itranswarp')
            run('/etc/init.d/nginx reload')
        print ('ROLLBACKED OK.')

def deploy():
    build()
    scp()
