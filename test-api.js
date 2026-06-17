const app = require('./backend/server.js');
const { pool } = require('./backend/config/db');

async function test() {
  const ctrl = require('./backend/controllers/serviceController');
  const req = { user: { userId: 'p1' } };
  const res = {
    status: (code) => ({ json: (data) => console.log('STATUS', code, data) }),
    json: (data) => console.log('SUCCESS', JSON.stringify(data).substring(0, 200))
  };
  await ctrl.getProviderServices(req, res);
  pool.end();
}
test();
