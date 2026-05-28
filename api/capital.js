export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { tag } = req.query; 
    if (!tag) return res.status(400).json({ error: "缺少部落标签" });

    let clanTag = tag;
    if (tag === 'hq') clanTag = '2RU0YVUUV';
    else if (tag === 'br') clanTag = '2LU2RRRRY';
    else clanTag = tag.replace('#', '').toUpperCase();
    
    // 首领专属小写 e 密匙
    const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjQ0MjZhMzE4LTliYmItNGI2YS05YTcyLTQzNGU2YmI4ZTA5NSIsImlhdCI6MTc3OTkzOTkwOSwic3ViIjoiZGV2ZWxvcGVyL2RmNzdjNjA1LTM2ZGUtODEyYy01MjEzLWM1OGNlNmYyZDk0ZiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjQ1Ljc5LjIxOC43OSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.9b_hP4uypZrQFYetczH8Owg8wmX8GuE7zOqSB6hoWvz1Cf2SA_4P2ifJq-w2kd2bxlS8YZQNp55Uv-uL0gHkYw";
    
    try {
        // 请求官方的都城突袭专线 (limit=1 代表只拿最新的一期)
        const url = `https://cocproxy.royaleapi.dev/v1/clans/%23${clanTag}/capitalraidseasons?limit=1`;
        
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${TOKEN}`, "Accept": "application/json" }
        });
        
        const data = await response.json();
        
        if (data.reason === 'accessDenied') return res.status(200).json({ reason: 'accessDenied' });
        if (data.reason === 'notFound' || !data.items || data.items.length === 0) {
            return res.status(200).json({ state: 'notInRaid', error: "该部落暂无都城突袭数据，或未解锁都城。" });
        }

        // 把最新一期的都城数据发给前端大屏
        res.status(200).json(data.items[0]);
    } catch (error) {
        res.status(500).json({ error: "都城卫星通信故障" });
    }
}
