document.addEventListener('DOMContentLoaded', () => {
    // 地図の初期化 (日本の中心あたり)
    const map = L.map('map').setView([36, 138], 5);

    // 地図タイル（国土地理院）
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
    }).addTo(map);

    // 地震情報を取得して表示する非同期関数
    async function fetchEarthquakeData() {
        // P2P地震情報のAPIを利用 (過去50件の震度1以上の地震情報を取得)
        const apiUrl = 'https://api.p2pquake.net/v2/history?codes=551&limit=50';
        const listElement = document.getElementById('earthquake-list');
        listElement.innerHTML = ''; // 初期メッセージをクリア

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.length === 0) {
                listElement.innerHTML = '<li>表示できる地震情報がありません。</li>';
                return;
            }

            // データを地図とリストに表示
            data.forEach(quake => {
                const earth = quake.earthquake;
                if (!earth || !earth.hypocenter || !earth.hypocenter.latitude) return;

                const lat = parseFloat(earth.hypocenter.latitude);
                const lon = parseFloat(earth.hypocenter.longitude);
                const mag = earth.hypocenter.magnitude;
                const depth = earth.hypocenter.depth;
                const maxScale = earth.maxScale;
                const time = new Date(earth.time).toLocaleString('ja-JP');
                const place = earth.hypocenter.name;

                // マグニチュードに応じて円の半径を計算 (視覚的な強調のため)
                const radius = Math.pow(1.5, mag) * 1000;

                // 震度に応じて色を決定
                const color = getScaleColor(maxScale);

                // 地図に円を描画
                const circle = L.circle([lat, lon], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.5,
                    radius: radius
                }).addTo(map);

                // ポップアップで詳細情報を表示
                circle.bindPopup(`
                    <b>発生時刻:</b> ${time}<br>
                    <b>震源地:</b> ${place}<br>
                    <b>マグニチュード:</b> ${mag}<br>
                    <b>深さ:</b> ${depth}km<br>
                    <b>最大震度:</b> ${convertScale(maxScale)}
                `);

                // リストに情報を追加
                const listItem = document.createElement('li');
                listItem.textContent = `${time} | 震源地: ${place} | M${mag} | 最大震度: ${convertScale(maxScale)}`;
                listElement.appendChild(listItem);
            });

        } catch (error) {
            console.error('地震情報の取得に失敗しました:', error);
            listElement.innerHTML = '<li>情報の取得に失敗しました。時間をおいて再度お試しください。</li>';
        }
    }

    // 震度コード(数値)を震度階級(文字列)に変換
    function convertScale(scale) {
        const scaleMap = {
            10: '1', 20: '2', 30: '3', 40: '4',
            45: '5弱', 50: '5強', 55: '6弱', 60: '6強', 70: '7'
        };
        return scaleMap[scale] || '不明';
    }

    // 震度に応じて色を返す
    function getScaleColor(scale) {
        if (scale >= 55) return '#d73027'; // 6弱以上 (赤)
        if (scale >= 50) return '#fc8d59'; // 5強 (オレンジ)
        if (scale >= 30) return '#fee08b'; // 3-5弱 (黄)
        return '#91cf60'; // 1-2 (緑)
    }

    // 関数を実行してデータを表示
    fetchEarthquakeData();
});