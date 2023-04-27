const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let database = null;

const initializationDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializationDbAndServer();

const convertSnackToCamel = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const convertDbObjectToResponse = (dataObject) => {
  return {
    matchId: dataObject.match_id,
    match: dataObject.match,
    year: dataObject.year,
  };
};

//GET players API
app.get("/players/", async (require, response) => {
  const getPlayersQuarry = `
        SELECT 
          *
        FROM 
          player_details;`;
  const getPlayerDetail = await database.all(getPlayersQuarry);
  response.send(
    getPlayerDetail.map((eachPlayer) => convertSnackToCamel(eachPlayer))
  );
});

//GET player API
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuarry = `
    SELECT 
      *
    FROM 
      player_details
    WHERE 
      player_id= ${playerId};`;
  const player = await database.get(getPlayerQuarry);
  response.send(convertSnackToCamel(player));
});

//PUT player API
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updateQuarry = `
  UPDATE 
        player_details
    SET
        player_name = '${playerName}'
    WHERE 
        player_id = ${playerId};`;
  await database.run(updateQuarry);
  response.send("Player Details Updated");
});

//GET match API
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const matchQuarry = `
    SELECT 
      *
    FROM 
        match_details
    WHERE
        match_id = ${matchId};`;
  const match = await database.get(matchQuarry);
  response.send(convertDbObjectToResponse(match));
});

// Get combination of player_match_score and match_details
app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerMatchQuarry = `
        SELECT 
            match_details.match_id AS matchId,
            match_details.match AS match,
            match_details.year AS year
        FROM
            player_match_score NATURAL JOIN match_details
        WHERE
            player_id = ${playerId};`;
  const getPlayerMatch = await database.all(getPlayerMatchQuarry);
  response.send(getPlayerMatch);
});

//GET combination of player_match_score and player_details
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getMatchPlayersQuery = `
	    SELECT
	      player_details.player_id AS playerId,
	      player_details.player_name AS playerName
	    FROM player_match_score NATURAL JOIN player_details
        WHERE match_id=${matchId};`;
  const playerDetails = await database.all(getMatchPlayersQuery);
  response.send(playerDetails);
});

//GET combination of player_details and player_match_score
app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerScored = `
    SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `;
  const playerScore = await database.get(getPlayerScored);
  response.send(playerScore);
});

module.exports = app;
