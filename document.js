document.addEventListener('DOMContentLoaded', () => {
    // --- 定数定義 ---
    const API_URL = 'https://api.p2pquake.net/v2/history?codes=551&limit=50';
    const MAP_CENTER = [36, 138];
    const MAP_ZOOM = 5;

    // --- DOM要素の取得 ---
    const listElement = document.getElementById('earthquake-list');

    // --- Leafletの初期化 ---
    // 地図の初期化 (日本の中心あたり)
    const map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
    const quakeLayer = L.layerGroup().addTo(map); // 地震マーカーを管理するレイヤー
    
    // 地図タイル（国土地理院）
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
    }).addTo(map);

    /**
     * 地震データを画面に描画する
     * @param {Array} data - 地震情報の配列
     */
    function renderEarthquakes(data) {
        // 既存の表示をクリア
        listElement.innerHTML = '';
        quakeLayer.clearLayers();

        if (!data || data.length === 0) {
            listElement.innerHTML = '<li>表示できる地震情報がありません。</li>';
            return;
        }

        // データを地図とリストに表示
        data.forEach(quake => {
            const earth = quake.earthquake;
            if (!earth?.hypocenter?.latitude) return; // データ構造を安全にチェック

            const { latitude, longitude, magnitude, depth, name } = earth.hypocenter;
            const { maxScale, time } = earth;

            const lat = parseFloat(latitude);
            const lon = parseFloat(longitude);
            const mag = magnitude;
            const displayTime = new Date(time).toLocaleString('ja-JP');

            // マグニチュードに応じて円の半径を計算
            const radius = Math.pow(1.5, mag) * 1000;
            // 震度に応じて色を決定
            const color = getScaleColor(maxScale);

            // 地図に円を描画
            const circle = L.circle([lat, lon], {
                color: color,
                fillColor: color,
                fillOpacity: 0.5,
                radius: radius
            });

            // ポップアップで詳細情報を表示
            circle.bindPopup(`
                <b>発生時刻:</b> ${displayTime}<br>
                <b>震源地:</b> ${name}<br>
                <b>マグニチュード:</b> ${mag}<br>
                <b>深さ:</b> ${depth}km<br>
                <b>最大震度:</b> ${convertScale(maxScale)}
            `);

            // 作成した円をレイヤーに追加
            quakeLayer.addLayer(circle);

            // リストに情報を追加
            const listItem = document.createElement('li');
            listItem.textContent = `${displayTime} | 震源地: ${name} | M${mag} | 最大震度: ${convertScale(maxScale)}`;
            listElement.appendChild(listItem);
        });
    }

    /**
     * 地震情報をAPIから取得する
     */
    async function fetchEarthquakeData() {
        listElement.innerHTML = '<li>データを読み込んでいます...</li>';
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderEarthquakes(data);
        } catch (error) {
            console.error('地震情報の取得に失敗しました:', error);
            listElement.innerHTML = `<li>情報の取得に失敗しました。時間をおいて再度お試しください。(エラー: ${error.message})</li>`;
        }
    }

    /**
     * 震度コード(数値)を震度階級(文字列)に変換する
     * @param {number} scale - 震度コード (例: 50)
     * @returns {string} 震度階級 (例: '5強')
     */
    function convertScale(scale) {
        const scaleMap = {
            10: '1', 20: '2', 30: '3', 40: '4',
            45: '5弱', 50: '5強', 55: '6弱', 60: '6強', 70: '7'
        };
        return scaleMap[scale] ?? '不明';
    }

    /**
     * 震度に応じて色を返す
     * @param {number} scale - 震度コード
     * @returns {string} 色のコード
     */
    function getScaleColor(scale) {
        if (scale >= 55) return '#d73027'; // 6弱以上 (赤)
        if (scale >= 50) return '#fc8d59'; // 5強 (オレンジ)
        if (scale >= 30) return '#fee08b'; // 3-5弱 (黄)
        return '#91cf60'; // 1-2 (緑)
    }

    // 初期データの読み込み
    fetchEarthquakeData();
});