const { ApiResponse } = require('../../src/core/ApiResponse');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('ApiResponse', () => {
  test('ok sends 200 in the { status, message, data } shape', () => {
    const res = mockRes();
    ApiResponse.ok(res, { id: 1 }, 'Loaded');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 200, message: 'Loaded', data: { id: 1 } });
  });

  test('created sends 201', () => {
    const res = mockRes();
    ApiResponse.created(res, { id: 2 });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 201, message: 'Created', data: { id: 2 } });
  });

  test('fail sends data null and no errors key when there are none', () => {
    const res = mockRes();
    ApiResponse.fail(res, 404, 'Missing');
    expect(res.json).toHaveBeenCalledWith({ status: 404, message: 'Missing', data: null });
  });

  test('fail includes the errors list when given', () => {
    const res = mockRes();
    ApiResponse.fail(res, 400, 'Bad', [{ path: 'name', message: 'Required' }]);
    expect(res.json).toHaveBeenCalledWith({
      status: 400,
      message: 'Bad',
      data: null,
      errors: [{ path: 'name', message: 'Required' }],
    });
  });
});
