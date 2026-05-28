export default async function handler(req, res) {
    // 允许跨域请求
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // 获取前端发来的指令（默认查主营，传 br 查分部）
    const { tag } = req.query; 
    const clanTag = tag === 'br' ? '2LU2RRRRY' : '2RU0YVUUV';
    
    // 你的 Supercell 绝密钥匙
    const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjQ0MjZhMzE4LTliYmItNGI2YS05YTcyLTQzNGU2YmI4ZTA5NSIsImlhdCI6MTc3OTkzOTkwOSwic3ViIjoiZGV2ZWxvcGVyL2RmNzdjNjA1LTM2ZGUtODEyYy01MjEzLWM1OGNlNmYyZDk0ZiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjQ1Ljc5LjIxOC43OSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.9b_hP4uypZrQFYetczH8Owg8wmX8GuE7zOqSB6hoWvz1Cf2SA_4P2ifJq-w2kd2bxlS8YZQNp55Uv-uL0gHkYw";
    
    try {
        // 利用 RoyaleAPI 极客中转站，伪装成合法 IP 去调取官方数据
        const url = `https://cocproxy.royaleapi.dev/v1/clans/%23${clanTag}/currentwar`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                "Authorization": `Bearer ${TOKEN}`,
                "Accept": "application/json"
            }
        });
        
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("雷达通讯故障:", error);
        res.status(500).json({ error: "无法连接到 Supercell 卫星网络" });
    }
}
