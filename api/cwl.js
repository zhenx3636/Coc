export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
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

        // 🚀 新增核武器：直接偷取 8 大部落的底牌大名单
        let groupRoster = [];
        if (groupData.clans) {
            groupRoster = groupData.clans.map(c => {
                let thCounts = {};
                c.members.forEach(m => {
                    thCounts[m.townHallLevel] = (thCounts[m.townHallLevel] || 0) + 1;
                });
                return { tag: c.tag, name: c.name, thCounts: thCounts, total: c.members.length };
            });
        }

        let activeWarData = null;
        for (let i = groupData.rounds.length - 1; i >= 0; i--) {
            const round = groupData.rounds[i];
            if (round.warTags[0] === '#0') continue; 

            const warPromises = round.warTags.map(wt => 
                fetch(`https://cocproxy.royaleapi.dev/v1/clanwarleagues/wars/${encodeURIComponent(wt)}`, { headers: { "Authorization": `Bearer ${TOKEN}` } }).then(r => r.json())
            );
            const wars = await Promise.all(warPromises);
            const ourWar = wars.find(w => !w.reason && (w.clan.tag === `#${clanTag}` || w.opponent.tag === `#${clanTag}`));

            if (ourWar && (ourWar.state === 'inWar' || ourWar.state === 'preparation')) {
                activeWarData = ourWar; break; 
            } else if (ourWar && ourWar.state === 'warEnded' && !activeWarData) {
                activeWarData = ourWar; 
            }
        }

        if (!activeWarData) {
            // 如果还没匹配到对手，也把大名单发回去
            return res.status(200).json({ state: 'preparation', clan: { name: "联赛匹配中" }, opponent: { name: "等待对决" }, groupRoster: groupRoster });
        }

        if (activeWarData.opponent.tag === `#${clanTag}`) {
            const temp = activeWarData.clan;
            activeWarData.clan = activeWarData.opponent;
            activeWarData.opponent = temp;
        }

        activeWarData.attacksPerMember = 1;
        // 把 8大部落底牌 装载进返回数据中
        activeWarData.groupRoster = groupRoster;
        
        res.status(200).json(activeWarData);
    } catch (error) {
        res.status(500).json({ error: "服务器通信故障" });
    }
}
