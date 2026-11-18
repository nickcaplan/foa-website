import unittest, importlib.util
from datetime import datetime, timezone
spec=importlib.util.spec_from_file_location('freshness_audit','scripts/fayre_freshness_audit.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def snap(*stamps):
    """Build a snapshot whose activities carry the given checkedAt stamps."""
    return {'schema':1,'checkedAt':stamps[0],'activities':{str(i):{'name':str(i),'rows':[],'checkedAt':s} for i,s in enumerate(stamps[1:])}}
class WindowTests(unittest.TestCase):
    def test_inside_window(self):
        """Verify a London winter morning is inside the window."""
        self.assertTrue(m.in_window(datetime(2026,11,18,9,0,tzinfo=timezone.utc)))
    def test_before_window(self):
        """Verify 06:59 London is outside the window."""
        self.assertFalse(m.in_window(datetime(2026,11,18,6,59,tzinfo=timezone.utc)))
    def test_after_window(self):
        """Verify 21:00 London is outside the window."""
        self.assertFalse(m.in_window(datetime(2026,11,18,21,0,tzinfo=timezone.utc)))
    def test_window_edge_uses_london_not_utc(self):
        """Verify a summer date applies the London offset, not UTC."""
        self.assertFalse(m.in_window(datetime(2026,6,18,20,30,tzinfo=timezone.utc)))  # 21:30 BST
    def test_after_fayre(self):
        """Verify the window closes for good once the fayre has ended."""
        self.assertFalse(m.in_window(datetime(2026,12,6,9,0,tzinfo=timezone.utc)))
class NewestTests(unittest.TestCase):
    def test_newest_across_activities(self):
        """Verify the newest activity stamp wins over the top-level stamp."""
        s=snap('2026-11-18T09:00:00+00:00','2026-11-18T09:02:00+00:00','2026-11-18T08:59:00+00:00')
        self.assertEqual(m.newest_checked_at(s),datetime(2026,11,18,9,2,tzinfo=timezone.utc))
    def test_top_level_only(self):
        """Verify the top-level stamp is used when there are no activities."""
        self.assertEqual(m.newest_checked_at(snap('2026-11-18T09:00:00+00:00')),datetime(2026,11,18,9,0,tzinfo=timezone.utc))
if __name__=='__main__':
    unittest.main()
