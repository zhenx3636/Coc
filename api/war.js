export default async function handler(req, res) {
    // 允许跨域请求
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { tag } = req.query; 
    if (!tag) return res.status(400).json({ error: "缺少部落标签" });

    // 智能识别：如果是 hq/br 就转换，如果是自定义标签就剔除 # 号
    let clanTag = tag;
    if (tag === 'hq') clanTag = '2RU0YVUUV';
    else if (tag === 'br') clanTag = '2LU2RRRRY';
    else clanTag = tag.replace('#', '').toUpperCase();
    
    // 你的 Supercell 绝密钥匙 (首字母已修复为小写)
    const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjQ0MjZhMzE4LTliYmItNGI2YS05YTcyLTQzNGU2YmI4ZTA5NSIsImlhdCI6MTc3OTkzOTkwOSwic3ViIjoiZGV2ZWxvcGVyL2RmNzdjNjA1LTM2ZGUtODEyYy01MjEzLWM1OGNlNmYyZDk0ZiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjQ1Ljc5LjIxOC43OSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.9b_hP4uypZrQFYetczH8Owg8wmX8GuE7zOqSB6hoWvz1Cf2SA_4P2ifJq-w2kd2bxlS8YZQNp55Uv-uL0gHkYw";
    
    try {
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
