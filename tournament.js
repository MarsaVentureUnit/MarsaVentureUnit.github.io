// Firebase Realtime Database URL
const FIREBASE_DB_URL = 'https://sga165-test-default-rtdb.firebaseio.com/';

// Tournament data structure
const defaultTournamentData = {
    groups: {
        A: { teams: {}, matches: [] },
        B: { teams: {}, matches: [] },
        C: { teams: {}, matches: [] },
        D: { teams: {}, matches: [] },
        E: { teams: {}, matches: [] }
    }
};

// Load tournament data from Firebase
async function loadTournamentData() {
    try {
        const response = await fetch(`${FIREBASE_DB_URL}tournament.json`);
        const data = await response.json();
        return data || JSON.parse(JSON.stringify(defaultTournamentData));
    } catch (error) {
        console.error('Error loading data:', error);
        return JSON.parse(JSON.stringify(defaultTournamentData));
    }
}

// Save tournament data to Firebase
async function saveTournamentData(data) {
    try {
        const response = await fetch(`${FIREBASE_DB_URL}tournament.json`, {
            method: 'PUT',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        return await response.json();
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// Add a team to a group
async function addTeam(groupId, teamName) {
    const tournamentData = await loadTournamentData();
    const teamId = teamName.toLowerCase().replace(/\s+/g, '_');
    
    if (tournamentData.groups[groupId].teams[teamId]) {
        throw new Error("A team with this name already exists in the group!");
    }
    
    tournamentData.groups[groupId].teams[teamId] = {
        name: teamName,
        matchesPlayed: 0,
        matchesWon: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        pointsScored: 0,
        points: 0
    };
    
    await saveTournamentData(tournamentData);
    return tournamentData;
}

// Clear all teams from a group
async function clearGroup(groupId) {
    const tournamentData = await loadTournamentData();
    tournamentData.groups[groupId].teams = {};
    tournamentData.groups[groupId].matches = [];
    await saveTournamentData(tournamentData);
    return tournamentData;
}

// Update match result
async function updateMatchResult(groupId, homeTeamId, awayTeamId, homeScore, awayScore) {
    const tournamentData = await loadTournamentData();
    const group = tournamentData.groups[groupId];
    const homeTeam = group.teams[homeTeamId];
    const awayTeam = group.teams[awayTeamId];
    
    if (!homeTeam || !awayTeam) {
        throw new Error("One or both teams not found in the group!");
    }
    
    // Remove existing match if it exists
    group.matches = group.matches.filter(match => 
        !((match.homeTeam === homeTeamId && match.awayTeam === awayTeamId) ||
        (match.homeTeam === awayTeamId && match.awayTeam === homeTeamId))
    );
    
    // Determine winner and points (3 points for win, 0 for loss)
    const homeWon = homeScore > awayScore;
    
    // Update home team stats
    homeTeam.matchesPlayed += 1;
    homeTeam.setsWon += homeScore;
    homeTeam.setsLost += awayScore;
    homeTeam.pointsScored += homeScore;
    homeTeam.matchesWon += homeWon ? 1 : 0;
    homeTeam.matchesLost += homeWon ? 0 : 1;
    homeTeam.points += homeWon ? 3 : 0;
    
    // Update away team stats
    awayTeam.matchesPlayed += 1;
    awayTeam.setsWon += awayScore;
    awayTeam.setsLost += homeScore;
    awayTeam.pointsScored += awayScore;
    awayTeam.matchesWon += homeWon ? 0 : 1;
    awayTeam.matchesLost += homeWon ? 1 : 0;
    awayTeam.points += homeWon ? 0 : 3;
    
    // Record the match
    group.matches.push({
        homeTeam: homeTeamId,
        awayTeam: awayTeamId,
        homeScore: homeScore,
        awayScore: awayScore,
        timestamp: Date.now()
    });
    
    await saveTournamentData(tournamentData);
    return tournamentData;
}

// Helper function to sort teams for standings
function sortTeams(groupTeams) {
    return groupTeams.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.setsWon - b.setsLost !== a.setsWon - a.setsLost) 
            return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost);
        return b.pointsScored - a.pointsScored;
    });
}