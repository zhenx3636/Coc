export default async function handler(req, res) {
    // 允许跨域请求
    res.setHeader('Access-Control-Allow-Origin', '*');
    // 🚀 修复1：强行禁止 Vercel 和浏览器缓存，每次必须拿最新鲜的情报
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const { tag } = req.query; 
    if (!tag) return res.status(400).json({ error: "缺少部落标签" });

    let clanTag = tag;
    if (tag === 'hq') clanTag = '2RU0YVUUV';
    else if (tag === 'br') clanTag = '2LU2RRRRY';
    else clanTag = tag.replace('#', '').toUpperCase();
    
    const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjQ0MjZhMzE4LTliYmItNGI2YS05YTcyLTQzNGU2YmI4ZTA5NSIsImlhdCI6MTc3OTkzOTkwOSwic3ViIjoiZGV2ZWxvcGVyL2RmNzdjNjA1LTM2ZGUtODEyYy01MjEzLWM1OGNlNmYyZDk0ZiIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjQ1Ljc5LjIxOC43OSJdLCJ0eXBlIjoiY2xpZW50In1dfQ.9b_hP4uypZrQFYetczH8Owg8wmX8GuE7zOqSB6hoWvz1Cf2SA_4P2ifJq-w2kd2bxlS8YZQNp55Uv-uL0gHkYw";
    
    try {
        const groupRes = await fetch(`https://cocproxy.royaleapi.dev/v1/clans/%23${clanTag}/currentwar/leaguegroup`, {
            headers: { "Authorization": `Bearer ${TOKEN}`, "Accept": "application/json" }
        });
        const groupData = await groupRes.json();
        
        if (groupData.reason === 'accessDenied') return res.status(200).json({ reason: 'accessDenied' });
        if (groupData.reason === 'notFound' || !groupData.rounds) return res.status(200).json({ state: 'notInWar', error: "该部落本月未报名联赛，或联赛已彻底结束" });

        let groupRoster = [];
        if (groupData.clans) {
            groupRoster = groupData.clans.map(c => {
                let thCounts = {};
                c.members.forEach(m => { thCounts[m.townHallLevel] = (thCounts[m.townHallLevel] || 0) + 1; });
                return { tag: c.tag, name: c.name, thCounts: thCounts, total: c.members.length };
            });
        }

        // 🚀 修复2：解决联赛“战斗日”和“明天的准备日”时空重叠的判定 Bug
        let activeWarData = null;      // 优先级1：正在打的
        let preparationWarData = null; // 优先级2：准备中的
        let endedWarData = null;       // 优先级3：刚刚打完的

        // 遍历所有轮次
        for (let i = groupData.rounds.length - 1; i >= 0; i--) {
            const round = groupData.rounds[i];
            if (round.warTags[0] === '#0') continue; 

            const warPromises = round.warTags.map(wt => 
                fetch(`https://cocproxy.royaleapi.dev/v1/clanwarleagues/wars/${encodeURIComponent(wt)}`, { headers: { "Authorization": `Bearer ${TOKEN}` } }).then(r => r.json())
            );
            const wars = await Promise.all(warPromises);
            const ourWar = wars.find(w => !w.reason && (w.clan.tag === `#${clanTag}` || w.opponent.tag === `#${clanTag}`));

            if (ourWar) {
                if (ourWar.state === 'inWar') {
                    activeWarData = ourWar; 
                    break; // 如果找到了“正在打的”，直接锁定，不再往前找了！
                } else if (ourWar.state === 'preparation' && !preparationWarData) {
                    preparationWarData = ourWar; // 备用选项：明天的准备日
                } else if (ourWar.state === 'warEnded' && !endedWarData) {
                    endedWarData = ourWar; // 备用选项：昨天的战报
                }
            }
        }

        // 终极裁决：战斗日 > 准备日 > 历史战报
        let finalWarData = activeWarData || preparationWarData || endedWarData;

        if (!finalWarData) {
            return res.status(200).json({ state: 'preparation', clan: { name: "联赛匹配中" }, opponent: { name: "等待对决" }, groupRoster: groupRoster });
        }

        if (finalWarData.opponent.tag === `#${clanTag}`) {
            const temp = finalWarData.clan;
            finalWarData.clan = finalWarData.opponent;
            finalWarData.opponent = temp;
        }

        finalWarData.attacksPerMember = 1;
        finalWarData.groupRoster = groupRoster;
        
        res.status(200).json(finalWarData);
    } catch (error) {
        res.status(500).json({ error: "服务器通信故障" });
    }
}
