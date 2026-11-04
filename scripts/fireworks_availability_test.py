import unittest, importlib.util
from datetime import datetime,timezone
spec=importlib.util.spec_from_file_location('availability','scripts/fireworks_availability.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def page(opened='3',time='15:30 - 16:30'):
    value='<div>FULL</div>' if opened=='FULL' else f'<div class="visible-xs visible-sm">{opened}</div><div class="visible-md visible-lg">{opened}</div>'
    return f'<div id="rows"><div class="row vertical-align"><div class="col-sm-9"><div class="ellipsis">Setup</div><div class="ellipsis indent">{time}</div><div class="usersall indent">PRIVATE NAME</div></div><div class="vcenter col-sm-2">{value}</div><div>Sign up</div></div></div>'
class ParserTests(unittest.TestCase):
    def test_open_count_once_and_no_personal_data(self):
        rows=m.parse(page());self.assertEqual(rows,[{'endsAt':'2026-11-05T16:30:00+00:00','open':3}]);self.assertNotIn('PRIVATE',str(rows))
    def test_full(self): self.assertEqual(m.parse(page('FULL'))[0]['open'],0)
    def test_zero(self): self.assertEqual(m.parse(page('0'))[0]['open'],0)
    def test_wrong_structure(self):
        for html in ['',page(time='Tomorrow'),page(opened='3').replace('visible-lg">3','visible-lg">4'),page(time='19:00 - 20:00')]:
            with self.assertRaises(ValueError): m.parse(html)
    def test_after_teardown_no_fetch(self):
        data=m.fetch(datetime(2026,11,5,19,0,tzinfo=timezone.utc));self.assertTrue(data['ended']);self.assertEqual(data['activities'],{})
if __name__=='__main__': unittest.main()
