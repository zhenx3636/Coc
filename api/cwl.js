export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const { tag } = req.query; 
    if (!tag) return res.status(400).json({ error: "缺少部落标签" });

    let clanTag = tag;
    if (tag === 'hq') clanTag = '2RU0YVUUV';
    else if (tag === 'br') clanTag = '2LU2RRRRY';
    else clanTag = tag.replace('#', '').toUpperCase();
    
    // 首领专属密匙
    const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjQ0MjZhMzE4LTliYmItNGI2YS05YTcyLTQzNGU2YmI4ZTA5NSIsImlhdCI6MTc3OTkzOTkwOSwic3ViIjoiZGV2ZWxvcGVyL2RmNzdjNjA1LTM2ZGUtODEyYy01MjEzLWM1OGNlNmYyZDk0ZiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjQ1Ljc5LjIxOC43OSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.9b_hP4uypZrQFYetczH8Owg8wmX8GuE7zOqSB6hoWvz1Cf2SA_4P2ifJq-w2kd2bxlS8YZQNp55Uv-uL0gHkYw";
    
    try {
        // 1. 先去拿联赛大组的总体情报
        const groupRes = await fetch(`https://cocproxy.royaleapi.dev/v1/clans/%23${clanTag}/currentwar/leaguegroup`, {
            headers: { "Authorization": `Bearer ${TOKEN}`, "Accept": "application/json" }
        });
        const groupData = await groupRes.json();
        
        if (groupData.reason === 'accessDenied') return res.status(200).json({ reason: 'accessDenied' });
        if (groupData.reason === 'notFound' || !groupData.rounds) return res.status(200).json({ state: 'notInWar', error: "该部落本月未报名联赛，或联赛已彻底结束" });

        let activeWarData = null;

        // 2. 联赛有 7 天（7轮），逆向搜索，找出当前正在打的那一轮
        for (let i = groupData.rounds.length - 1; i >= 0; i--) {
            const round = groupData.rounds[i];
            if (round.warTags[0] === '#0') continue; // 这轮还没开始

            // 并发请求这一轮的所有对战，找出有咱们部落的那一场
            const warPromises = round.warTags.map(wt => 
                fetch(`https://cocproxy.royaleapi.dev/v1/clanwarleagues/wars/${encodeURIComponent(wt)}`, { headers: { "Authorization": `Bearer ${TOKEN}` } }).then(r => r.json())
            );
            const wars = await Promise.all(warPromises);

            const ourWar = wars.find(w => !w.reason && (w.clan.tag === `#${clanTag}` || w.opponent.tag === `#${clanTag}`));

            if (ourWar && (ourWar.state === 'inWar' || ourWar.state === 'preparation')) {
                activeWarData = ourWar; break; // 找到正在打的了！
            } else if (ourWar && ourWar.state === 'warEnded' && !activeWarData) {
                activeWarData = ourWar; // 备用：如果今天打完了，显示最新打完的
            }
        }

        if (!activeWarData) return res.status(200).json({ error: "未能定位到具体的联赛对战" });

        // 3. 智能伪装：如果咱们部落在右边（作为对手），强行把它换到左边，防止前端大屏排版乱套
        if (activeWarData.opponent.tag === `#${clanTag}`) {
            const temp = activeWarData.clan;
            activeWarData.clan = activeWarData.opponent;
            activeWarData.opponent = temp;
        }

        // 联赛每人强制只有 1 刀
        activeWarData.attacksPerMember = 1;
        
        res.status(200).json(activeWarData);
    } catch (error) {
        res.status(500).json({ error: "服务器通信故障" });
    }
}
