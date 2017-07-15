#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from fabric.api import task, run

import re, os

from datetime import datetime
from fabric.api import *

def _now():
    return datetime.now().strftime('%Y-%m-%d_%H.%M.%S')

def _pwd():
    return os.path.dirname(os.path.abspath(__file__))

@task
def update_db(sqlFile=None):
    'update db by execute sql file.'
    if not sqlFile:
        print('SQL file not specified.')
        exit(1)
    pass

@task
def deploy():
    'deploy new version to target platform.'

    print('start deploy...')

    pwd = _pwd()
    now = _now()

    with lcd('%s/www' % pwd):
        excludes = ['.*', 'test', 'script', '*.sh', 'node_modules', 'package-lock.json']
        cmd = ['tar', '--dereference', '-czvf', '../itranswarp.tar.gz']
        cmd.extend(['--exclude=\'%s\'' % ex for ex in excludes])
        cmd.append('*')
        local(' '.join(cmd))
        put('../itranswarp.tar.gz', '/tmp/itranswarp.tar.gz')

    # will deploy to /srv/itranswarp/www-<now>

    run('mkdir -p /srv/itranswarp/www-%s' % now)

    # unzip tar.gz file to /srv/itranswarp/www-<now>

    with cd('/srv/itranswarp/www-%s' % now):
        print('unzip tar.gz...')
        run('tar zxvf /tmp/itranswarp.tar.gz')
        print('remove tar.gz...')
        # run npm install:
        run('npm install')

    # update owner and create symbol link: /srv/itranswarp/www -> /srv/itranswarp/www-<now>

    with cd('/srv/itranswarp'):
        run('chown -R www-data:www-data www-%s' % now)
        print('updating symbol link...')
        run('rm -f www')
        run('ln -s www-%s www' % now)

    # restart supervisor:

    print('restarting itranswarp...')
    with settings(warn_only=True):
        run('supervisorctl stop itranswarp')
        run('supervisorctl start itranswarp')
    # done:
    print('deploy ok.')

@task
def rollback():
    'rollback to previous version'

    print('start rollback...')
    RE_FILES = re.compile('\r?\n')
    with cd('/srv/itranswarp'):
        print('finding all versions under /srv/itranswarp...')
        r = run('ls -p -1')
        files = [s[:-1] for s in RE_FILES.split(r) if s.startswith('www-') and s.endswith('/')]
        files.sort(cmp=lambda s1, s2: 1 if s1 < s2 else -1)
        for f in files:
            print('  found: %s.' % f);
        r = run('ls -l www')
        ss = r.split(' -> ')
        if len(ss) != 2:
            print('ERROR: \'www\' is not a symbol link.')
            exit(1)
        current = ss[1]
        print('found current symbol link \'www\' points to: \'%s\'\n' % current)
        print('check symbol link...')
        try:
            index = files.index(current)
        except ValueError as e:
            print('ERROR: symbol link is invalid.')
            exit(1)
        if len(files) == index + 1:
            print('ERROR: already the oldest version.')
            exit(1)
        old = files[index + 1]
        print('information about rollback:')
        for f in files:
            if f == current:
                print('      current -> %s' % current)
            elif f == old:
                print('  rollback to -> %s' % old)
            else:
                print('                 %s' % f)
        print('rollback now...')
        run('rm -f www')
        run('ln -s %s www' % old)
        run('chown www-data:www-data www')
    print('restarting itranswarp...')
    with settings(warn_only=True):
        run('supervisorctl stop itranswarp')
        run('supervisorctl start itranswarp')
    print('rollback ok.')

@task
def backup(db_password):
    ' backup mysql database to local file '
    db_host = '2.liaoxuefeng.local'
    db_user = root
    dt = _now()
    f = 'backup-itranswarp-%s.sql' % dt
    with cd('/tmp'):
        run('mysqldump --host=%s --user=%s --password=%s --skip-opt --add-drop-table --default-character-set=utf8mb4 --quick itranswarp > %s' % (db_host, db_user, db_password, f))
        run('tar -czvf %s.tar.gz %s' % (f, f))
        run('rm -f %s' % f)
        get('%s.tar.gz' % f, '%s/backup/' % _current_path())
        run('rm -f %s.tar.gz' % f)

@task
def restore2local():
    ' restore database file to local mysql '
    backup_dir = os.path.join(_current_path(), 'backup')
    fs = os.listdir(backup_dir)
    files = [f for f in fs if f.startswith('backup-') and f.endswith('.sql.tar.gz')]
    files.sort(cmp=lambda s1, s2: 1 if s1 < s2 else -1)
    if len(files)==0:
        print('No backup files found.')
        return
    print ('Found %s backup files:' % len(files))
    print ('==================================================')
    n = 0
    for f in files:
        print ('%s: %s' % (n, f))
        n = n + 1
    print ('==================================================')
    print ('')
    try:
        num = int(raw_input ('Restore file: '))
    except ValueError:
        print ('Invalid file number.')
        return
    restore_file = files[num]
    yn = raw_input('Restore file %s: %s? y/N ' % (num, restore_file))
    if yn != 'y' and yn != 'Y':
        print ('Restore cancelled.')
        return
    print ('Start restore to local database...')
    p = raw_input('Input mysql root password: ')
    sqls = [
        'drop database if exists itranswarp;',
        'create database itranswarp;',
        'grant select, insert, update, delete on itranswarp.* to \'%s\'@\'localhost\' identified by \'%s\';' % (db_user, db_password)
    ]
    for sql in sqls:
        local(r'mysql -uroot -p%s -e "%s"' % (p, sql))
    with lcd(backup_dir):
        local('tar zxvf %s' % restore_file)
    local(r'mysql -uroot -p%s itranswarp < backup/%s' % (p, restore_file[:-7]))
    with lcd(backup_dir):
        local('rm -f %s' % restore_file[:-7])
