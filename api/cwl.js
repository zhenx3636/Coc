export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
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
        let standingsMap = {};
        if (groupData.clans) {
            groupData.clans.forEach(c => {
                let thCounts = {};
                c.members.forEach(m => { thCounts[m.townHallLevel] = (thCounts[m.townHallLevel] || 0) + 1; });
                groupRoster.push({ tag: c.tag, name: c.name, thCounts: thCounts, total: c.members.length });
                standingsMap[c.tag] = { tag: c.tag, name: c.name, stars: 0, destruction: 0 };
            });
        }

        let allWarTags = [];
        groupData.rounds.forEach(r => {
            r.warTags.forEach(wt => { if (wt !== '#0') allWarTags.push(wt); });
        });

        const allWarsPromises = allWarTags.map(wt => 
            fetch(`https://cocproxy.royaleapi.dev/v1/clanwarleagues/wars/${encodeURIComponent(wt)}`, { headers: { "Authorization": `Bearer ${TOKEN}` } }).then(r => r.json())
        );
        const allWars = await Promise.all(allWarsPromises);

        let activeWarData = null;
        let preparationWarData = null;
        let endedWarData = null;

        allWars.forEach(w => {
            if (w.reason) return;

            if (w.clan.tag === `#${clanTag}` || w.opponent.tag === `#${clanTag}`) {
                if (w.state === 'inWar') activeWarData = w;
                else if (w.state === 'preparation') preparationWarData = w;
                else if (w.state === 'warEnded') endedWarData = w; 
            }

            if (w.state === 'inWar' || w.state === 'warEnded') {
                const c1 = w.clan;
                const c2 = w.opponent;
                if (standingsMap[c1.tag] && standingsMap[c2.tag]) {
                    standingsMap[c1.tag].stars += c1.stars;
                    standingsMap[c1.tag].destruction += c1.destructionPercentage;
                    standingsMap[c2.tag].stars += c2.stars;
                    standingsMap[c2.tag].destruction += c2.destructionPercentage;

                    if (w.state === 'warEnded') {
                        if (c1.stars > c2.stars || (c1.stars === c2.stars && c1.destructionPercentage > c2.destructionPercentage)) {
                            standingsMap[c1.tag].stars += 10;
                        } else if (c2.stars > c1.stars || (c1.stars === c2.stars && c2.destructionPercentage > c1.destructionPercentage)) {
                            standingsMap[c2.tag].stars += 10;
                        }
                    }
                }
            }
        });

        // 🚀 终极修复：优先级大翻转！ 正在打的 > 刚打完的 > 明天准备的
        let finalWarData = activeWarData || endedWarData || preparationWarData;

        let standingsArray = Object.values(standingsMap);
        standingsArray.sort((a, b) => {
            if (b.stars !== a.stars) return b.stars - a.stars;
            return b.destruction - a.destruction;
        });

        if (!finalWarData) {
            return res.status(200).json({ state: 'preparation', clan: { name: "联赛匹配中" }, opponent: { name: "等待对决" }, groupRoster: groupRoster, standings: standingsArray });
        }

        if (finalWarData.opponent.tag === `#${clanTag}`) {
            const temp = finalWarData.clan;
            finalWarData.clan = finalWarData.opponent;
            finalWarData.opponent = temp;
        }

        finalWarData.attacksPerMember = 1;
        finalWarData.groupRoster = groupRoster;
        finalWarData.standings = standingsArray; 
        
        res.status(200).json(finalWarData);
    } catch (error) {
        res.status(500).json({ error: "服务器通信故障" });
    }
}
