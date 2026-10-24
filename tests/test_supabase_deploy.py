import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('deploy',Path(__file__).resolve().parents[1]/'scripts/supabase_deploy.py')
deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)

class MigrationSafety(unittest.TestCase):
    def test_already_applied_not_replayed(self):
        rows=deploy.files();self.assertEqual(deploy.validate_history(rows,rows),[])

    def test_only_new_files_pending(self):
        rows=deploy.files();self.assertEqual(deploy.validate_history(rows,rows[:-1]),rows[-1:])

    def test_changed_applied_file_rejected(self):
        rows=deploy.files();remote=[dict(r) for r in rows];remote[0]['checksum']='tampered'
        with self.assertRaisesRegex(ValueError,'edited'):deploy.validate_history(rows,remote)

    def test_removed_applied_file_rejected(self):
        rows=deploy.files()
        with self.assertRaisesRegex(ValueError,'removed'):deploy.validate_history(rows[1:],rows)

    def test_old_version_insert_rejected(self):
        rows=deploy.files()
        with self.assertRaisesRegex(ValueError,'newer'):deploy.validate_history(rows,rows[1:])

    def test_outer_transactions_removed(self):
        self.assertEqual(deploy.body('-- comment\nbegin;\nselect 1;\ncommit;\n').strip(),'select 1;')

    def test_nested_commit_rejected(self):
        with self.assertRaisesRegex(ValueError,'transaction'):deploy.body('begin;\nselect 1;\ncommit;\nselect 2;\ncommit;')

    def test_noop_deploy_does_not_replay_creates(self):
        rows=deploy.files();calls=[]
        def query(sql):
            calls.append(sql)
            return rows if sql.startswith('select version') else []
        with patch.object(deploy,'query',query):deploy.deploy()
        transaction=next(sql for sql in calls if sql.startswith('begin;'))
        self.assertNotIn('create table brb_private.profiles',transaction)
        self.assertIn('pg_advisory_xact_lock',transaction)
        self.assertIn('Database history advanced beyond this checkout',transaction)

    def test_history_rechecked_under_lock_before_pending_sql(self):
        rows=deploy.files();calls=[]
        def query(sql):
            calls.append(sql)
            return (rows[:-1] if len(calls)==1 else rows) if sql.startswith('select version') else []
        with patch.object(deploy,'query',query):deploy.deploy()
        transaction=next(sql for sql in calls if sql.startswith('begin;'))
        lock=transaction.index('pg_advisory_xact_lock')
        unknown=transaction.index('Database history advanced beyond this checkout')
        older=transaction.index('Migration version is older than database history')
        ddl=transaction.index(deploy.body(rows[-1]['sql']).strip())
        self.assertLess(lock,unknown);self.assertLess(unknown,older);self.assertLess(older,ddl)

if __name__=='__main__':unittest.main()
