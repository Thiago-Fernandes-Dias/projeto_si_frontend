import unittest
import json
from app import app, registered_users


class MockApiTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        registered_users.clear()
        registered_users['s002_cmu'] = {
            'target_password': '.tie5Roanl',
            'enrolled': True,
            'average_hold_ms': 120.0,
            'samples': []
        }

    def test_health_check(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')

    def test_register_user(self):
        payload = {
            'username': 'thiago_teste',
            'targetPassword': 'senhaSegura!1',
            'confirmPassword': 'senhaSegura!1'
        }
        response = self.client.post(
            '/api/register',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('thiago_teste', registered_users)

    def test_register_divergent_passwords(self):
        payload = {
            'username': 'thiago_teste',
            'targetPassword': 'senha1',
            'confirmPassword': 'senha2'
        }
        response = self.client.post(
            '/api/register',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)

    def test_enrollment_with_5_samples(self):
        samples = [
            {
                'repetition': i,
                'features': {'H.period': 0.12, 'DD.period.t': 0.35},
                'rawTimings': []
            }
            for i in range(1, 6)
        ]
        payload = {
            'username': 's002_cmu',
            'passwordLength': 10,
            'samplesCount': 5,
            'samples': samples
        }
        response = self.client.post(
            '/api/enrollment',
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['samplesRegistered'], 5)

    def test_authenticate_genuine(self):
        auth_payload = {
            'username': 's002_cmu',
            'passwordAttempt': '.tie5Roanl',
            'selectedAlgorithm': 'RANDOM_FOREST_HPO',
            'sample': {
                'rawTimings': [
                    {'key': '.', 'pressTime': 100, 'releaseTime': 225},  # 125ms hold
                    {'key': 't', 'pressTime': 350, 'releaseTime': 475}   # 125ms hold
                ]
            }
        }
        response = self.client.post(
            '/api/authenticate',
            data=json.dumps(auth_payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['decision'], 'GENUINE')
        self.assertGreaterEqual(data['confidenceScore'], 0.75)

    def test_authenticate_impostor(self):
        auth_payload = {
            'username': 's002_cmu',
            'passwordAttempt': '.tie5Roanl',
            'selectedAlgorithm': 'RANDOM_FOREST_HPO',
            'sample': {
                'rawTimings': [
                    {'key': '.', 'pressTime': 100, 'releaseTime': 550},  # 450ms hold (anormal)
                    {'key': 't', 'pressTime': 800, 'releaseTime': 1250}  # 450ms hold (anormal)
                ]
            }
        }
        response = self.client.post(
            '/api/authenticate',
            data=json.dumps(auth_payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['decision'], 'IMPOSTOR')
        self.assertLess(data['confidenceScore'], 0.75)


if __name__ == '__main__':
    unittest.main()
