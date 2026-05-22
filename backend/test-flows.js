/**
 * Test script: kiểm tra tất cả luồng nghiệp vụ sau khi chỉnh sửa
 * Chạy: node test-flows.js
 */
require('dotenv').config();
const BASE = 'http://localhost:3000/api';

let pass = 0, fail = 0;

async function req(method, path, body, token) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch(BASE + path, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    return { status: res.status, data };
}

function ok(label, condition, info = '') {
    if (condition) {
        console.log(`  ✅ ${label}${info ? ' → ' + info : ''}`);
        pass++;
    } else {
        console.error(`  ❌ ${label}${info ? ' → ' + info : ''}`);
        fail++;
    }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
    console.log('\n🧪 BêTráp — Kiểm Tra Toàn Bộ Luồng Nghiệp Vụ\n');
    console.log('='.repeat(55));

    // ── 1. HEALTH CHECK ────────────────────────────────────────
    console.log('\n📌 1. Health Check');
    const health = await req('GET', '/../').catch(() => ({ status: 0, data: {} }));

    // ── 2. AUTH — ĐĂNG NHẬP ───────────────────────────────────
    console.log('\n📌 2. Auth — Đăng nhập');

    const loginCustomer = await req('POST', '/auth/login', { email: 'mai@gmail.com', password: '123456' });
    ok('Customer login (plain text password)', loginCustomer.status === 200, `role=${loginCustomer.data?.session?.role}`);
    const customerToken = loginCustomer.data?.token;
    const customerId = loginCustomer.data?.session?.userId;

    const loginProvider = await req('POST', '/auth/login', { email: 'lan@betrap.vn', password: '123456' });
    ok('Provider login (plain text password)', loginProvider.status === 200, `role=${loginProvider.data?.session?.role}`);
    const providerToken = loginProvider.data?.token;
    const providerId = loginProvider.data?.session?.userId;

    const loginWrong = await req('POST', '/auth/login', { email: 'mai@gmail.com', password: 'wrongpass' });
    ok('Login sai mật khẩu → 401', loginWrong.status === 401);

    const loginNoEmail = await req('POST', '/auth/login', { email: 'noone@betrap.vn', password: '123456' });
    ok('Login email không tồn tại → 401', loginNoEmail.status === 401);

    // ── 3. SERVICES ───────────────────────────────────────────
    console.log('\n📌 3. Services');

    const svcs = await req('GET', '/services');
    ok('GET /services trả về danh sách', svcs.status === 200 && Array.isArray(svcs.data), `count=${svcs.data?.length}`);

    const svc1 = svcs.data?.[0];
    const svcDetail = await req('GET', '/services/' + svc1?.id);
    ok('GET /services/:id trả về chi tiết', svcDetail.status === 200 && svcDetail.data?.id === svc1?.id);

    // ── 4. ĐĂNG KÝ (giữ nguyên) ──────────────────────────────
    console.log('\n📌 4. Đăng Ký');
    const regData = {
        name: 'Test User',
        email: `test_${Date.now()}@test.com`,
        password: 'Test@123',
        role: 'customer',
        phone: '0901234567',
        location: 'Hà Nội'
    };
    const reg = await req('POST', '/auth/register', regData);
    ok('Đăng ký customer mới', reg.status === 200 && reg.data?.token);

    const regDup = await req('POST', '/auth/register', regData);
    ok('Đăng ký email trùng → 400', regDup.status === 400);

    const regBadPass = await req('POST', '/auth/register', { ...regData, email: 'other@test.com', password: '123456' });
    ok('Đăng ký mật khẩu yếu → 400', regBadPass.status === 400);

    // ── 5. ĐẶT HÀNG ──────────────────────────────────────────
    console.log('\n📌 5. Đặt Hàng (Customer)');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const createTxn = await req('POST', '/transactions', {
        serviceId: svc1?.id,
        date: dateStr,
        time: '08:00',
        address: 'Số 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
        note: 'Test đặt hàng'
    }, customerToken);
    ok('Đặt hàng thành công → status=pending', createTxn.status === 200 && createTxn.data?.id, `txnId=${createTxn.data?.id}`);
    const txnId = createTxn.data?.id;

    const createTxnPast = await req('POST', '/transactions', {
        serviceId: svc1?.id,
        date: '2020-01-01',
        time: '08:00',
        address: 'Số 123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
    }, customerToken);
    ok('Đặt hàng ngày quá khứ → 400', createTxnPast.status === 400);

    const createTxnShortAddr = await req('POST', '/transactions', {
        serviceId: svc1?.id,
        date: dateStr,
        time: '08:00',
        address: 'quá ngắn',
    }, customerToken);
    ok('Đặt hàng địa chỉ < 10 ký tự → 400', createTxnShortAddr.status === 400);

    // ── 6. XEM ĐƠN HÀNG ─────────────────────────────────────
    console.log('\n📌 6. Xem Đơn Hàng');

    const myOrders = await req('GET', '/transactions/' + customerId, null, customerToken);
    ok('Customer xem đơn hàng của mình', myOrders.status === 200 && Array.isArray(myOrders.data));
    
    const latestTxn = myOrders.data?.find(o => o.id === txnId);
    ok('Đơn mới tạo có status=pending', latestTxn?.status === 'pending');
    ok('Đơn mới có cancelReason=null', latestTxn?.cancelReason === null);

    const orderDetail = await req('GET', '/transaction/' + txnId, null, customerToken);
    ok('Xem chi tiết đơn hàng', orderDetail.status === 200 && orderDetail.data?.id === txnId);

    // Provider xem đơn hàng của mình
    const provOrders = await req('GET', '/transactions/' + providerId, null, providerToken);
    ok('Provider xem đơn hàng của mình', provOrders.status === 200);

    // Customer KHÔNG xem được đơn của người khác
    const otherOrders = await req('GET', '/transactions/' + providerId, null, customerToken);
    ok('Customer không xem được đơn của provider khác → 403', otherOrders.status === 403);

    // ── 7. PROVIDER XÁC NHẬN ĐƠN ────────────────────────────
    console.log('\n📌 7. Provider Xác Nhận Đơn Hàng');

    if (txnId) {
        const confirm = await req('PUT', '/transaction/' + txnId + '/status', { status: 'confirmed' }, providerToken);
        ok('Provider xác nhận đơn → confirmed', confirm.status === 200 && confirm.data?.success);

        const confirmedTxn = await req('GET', '/transaction/' + txnId, null, customerToken);
        ok('Đơn đã có status=confirmed', confirmedTxn.data?.status === 'confirmed');

        // ── 8. CUSTOMER HOÀN THÀNH ──────────────────────────
        console.log('\n📌 8. Customer Hoàn Thành Đơn Hàng');

        const done = await req('PUT', '/transaction/' + txnId + '/status', { status: 'done' }, customerToken);
        ok('Customer bấm Hoàn Thành → done', done.status === 200 && done.data?.success);

        const doneTxn = await req('GET', '/transaction/' + txnId, null, customerToken);
        ok('Đơn đã có status=done', doneTxn.data?.status === 'done');

        // ── 9. ĐÁNH GIÁ ─────────────────────────────────────
        console.log('\n📌 9. Đánh Giá & Nhận Xét');

        const review = await req('POST', '/reviews', {
            serviceId: svc1?.id,
            transactionId: txnId,
            rating: 5,
            comment: 'Dịch vụ tuyệt vời, đội bê tráp rất chuyên nghiệp!'
        }, customerToken);
        ok('Đánh giá thành công', review.status === 200 && review.data?.id, `reviewId=${review.data?.id}`);

        const dupReview = await req('POST', '/reviews', {
            serviceId: svc1?.id,
            transactionId: txnId,
            rating: 3,
            comment: 'Đánh giá lần 2'
        }, customerToken);
        ok('Không thể đánh giá 2 lần → 400', dupReview.status === 400);

        // Check review exists
        const hasReview = await req('GET', '/reviews/check/' + txnId, null, customerToken);
        ok('Check hasReview = true', hasReview.data?.hasReview === true);

        // Provider xem đánh giá
        const provReviews = await req('GET', '/reviews/provider/' + providerId, null, providerToken);
        ok('Provider xem đánh giá dịch vụ của mình', provReviews.status === 200 && Array.isArray(provReviews.data), `count=${provReviews.data?.length}`);

        // Service reviews public
        const svcReviews = await req('GET', '/reviews/service/' + svc1?.id);
        ok('Public xem đánh giá theo service', svcReviews.status === 200 && Array.isArray(svcReviews.data));
    }

    // ── 10. TỪ CHỐI VỚI LÝ DO ───────────────────────────────
    console.log('\n📌 10. Provider Từ Chối Đơn (Có Lý Do)');

    // Tạo đơn hàng mới để test từ chối
    const txn2 = await req('POST', '/transactions', {
        serviceId: svc1?.id,
        date: dateStr,
        time: '10:00',
        address: 'Số 456 Đường DEF, Phường GHI, Quận 2, TP.HCM',
    }, customerToken);
    const txnId2 = txn2.data?.id;
    ok('Tạo đơn hàng thứ 2', txn2.status === 200 && !!txnId2, `txnId=${txnId2}`);

    if (txnId2) {
        // Provider từ chối KHÔNG có lý do → 400
        const cancelNoReason = await req('PUT', '/transaction/' + txnId2 + '/status', {
            status: 'cancelled'
        }, providerToken);
        ok('Provider từ chối không có lý do → 400', cancelNoReason.status === 400, cancelNoReason.data?.error);

        // Provider từ chối CÓ lý do → 200
        const cancelWithReason = await req('PUT', '/transaction/' + txnId2 + '/status', {
            status: 'cancelled',
            cancelReason: 'Ngày đó đội đã có lịch kín, xin lỗi quý khách!'
        }, providerToken);
        ok('Provider từ chối có lý do → 200', cancelWithReason.status === 200 && cancelWithReason.data?.success);

        // Customer xem đơn bị từ chối — có lý do
        const cancelledTxn = await req('GET', '/transaction/' + txnId2, null, customerToken);
        ok('Đơn bị từ chối có cancelReason', cancelledTxn.data?.status === 'cancelled' && !!cancelledTxn.data?.cancelReason, `reason="${cancelledTxn.data?.cancelReason}"`);
    }

    // ── 11. CUSTOMER TỰ HUỶ (không cần lý do) ───────────────
    console.log('\n📌 11. Customer Tự Huỷ Đơn');

    const txn3 = await req('POST', '/transactions', {
        serviceId: svc1?.id,
        date: dateStr,
        time: '14:00',
        address: 'Số 789 Đường XYZ, Phường ABC, Quận 3, TP.HCM',
    }, customerToken);
    const txnId3 = txn3.data?.id;

    if (txnId3) {
        const customerCancel = await req('PUT', '/transaction/' + txnId3 + '/status', {
            status: 'cancelled'
        }, customerToken);
        ok('Customer tự huỷ không cần lý do', customerCancel.status === 200 && customerCancel.data?.success);
    }

    // ── 12. STATS ────────────────────────────────────────────
    console.log('\n📌 12. Stats');

    const custStats = await req('GET', '/stats/customer', null, customerToken);
    ok('Customer stats trả về đúng fields', custStats.status === 200 &&
       custStats.data?.hasOwnProperty('total') &&
       custStats.data?.hasOwnProperty('pending') &&
       custStats.data?.hasOwnProperty('done') &&
       custStats.data?.hasOwnProperty('cancelled'),
       JSON.stringify(custStats.data));

    const provStats = await req('GET', '/stats/provider', null, providerToken);
    ok('Provider stats', provStats.status === 200 && provStats.data?.hasOwnProperty('orders'));

    // Customer gọi /stats/provider → 403
    const custTryProvStats = await req('GET', '/stats/provider', null, customerToken);
    ok('Customer gọi provider stats → 403', custTryProvStats.status === 403);

    // ── 13. FAVORITES ────────────────────────────────────────
    console.log('\n📌 13. Favorites (Wishlist)');

    const fav = await req('POST', '/favorites/' + svc1?.id, {}, customerToken);
    ok('Toggle favorite → favorited', fav.status === 200);

    const favCheck = await req('GET', '/favorites/check/' + svc1?.id, null, customerToken);
    ok('Check favorite status', favCheck.status === 200 && typeof favCheck.data?.favorited === 'boolean');

    const favList = await req('GET', '/favorites', null, customerToken);
    ok('Get favorites list', favList.status === 200 && Array.isArray(favList.data));

    // ── KẾT QUẢ ─────────────────────────────────────────────
    console.log('\n' + '='.repeat(55));
    console.log(`\n🏁 KẾT QUẢ: ${pass} ✅ PASS  |  ${fail} ❌ FAIL\n`);
    if (fail === 0) {
        console.log('🎉 Tất cả test PASS! Hệ thống hoạt động đúng.\n');
    } else {
        console.log(`⚠️  Có ${fail} test FAIL. Cần kiểm tra lại.\n`);
    }
}

runTests().catch(err => {
    console.error('❌ Test runner error:', err.message);
    process.exit(1);
});
