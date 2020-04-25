import React, { useEffect, useState } from 'react';
import './App.css';

const Player = ({ name, teams, data, teamData }) => {
  return (
    <div>
      {name}
      <br />
      <small>({teams.map((id) => teamData[id].name).join(', ')})</small>

      {data && (
        <div>
          {data.nationality} - {data.primaryPosition.type} (
          {data.primaryPosition.code})
        </div>
      )}
    </div>
  );
};

const PlayerList = ({ players, handlePlayerRemoval, teamData }) => {
  const style = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
  };

  const removePlayer = (id) => handlePlayerRemoval(id);

  return (
    <div style={style}>
      {players.map((player) => (
        <div>
          <Player {...player} key={player.id} teamData={teamData} />
          <button onClick={() => removePlayer(player.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
};

const Team = ({ players, handlePlayerRemoval, teamData }) => {
  const forwards = players.filter(
    (player) => player.data.primaryPosition.type === 'Forward'
  );
  const defensemen = players.filter(
    (player) => player.data.primaryPosition.type === 'Defenseman'
  );
  const goalies = players.filter(
    (player) => player.data.primaryPosition.type === 'Goalies'
  );

  return (
    <div>
      <h2>Forwards</h2>

      <PlayerList
        players={forwards}
        handlePlayerRemoval={handlePlayerRemoval}
        teamData={teamData}
      />

      <h2>Defensemen</h2>

      <PlayerList
        players={defensemen}
        handlePlayerRemoval={handlePlayerRemoval}
        teamData={teamData}
      />

      <h2>Goalies</h2>

      <PlayerList
        players={goalies}
        handlePlayerRemoval={handlePlayerRemoval}
        teamData={teamData}
      />
    </div>
  );
};

export const App = () => {
  const [fetchComplete, setFetchComplete] = useState(false);
  const [rawPlayers, setRawPlayers] = useState([]);
  const [players, setPlayers] = useState({});
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [possiblePlayers, setPossiblePlayers] = useState([]);
  const [teams, setTeams] = useState({});
  const [errors, setErrors] = useState([]);

  const newestSeason = 2020;
  const oldestSeason = 1987;
  const years = Array.from(
    { length: newestSeason + 1 - oldestSeason },
    (v, k) => k + oldestSeason
  );

  useEffect(() => {
    if (players.length) {
      return;
    }

    years.forEach((year, i) => {
      const nextYear = years[i + 1];

      if (!nextYear) {
        return;
      }

      const season = `${year}${years[i + 1]}`;

      fetch(
        `https://statsapi.web.nhl.com/api/v1/teams?expand=team.roster&season=${season}`
      )
        .then((res) => res.json())
        .then(
          ({ teams }) => {
            const formattedPlayers = teams.map((team) => {
              if (!team.roster) {
                // For some reason the 2004-2005 NJ Devils team comes back with an empty roster???
                return [];
              }

              setTeams((previousTeams) => {
                return { ...previousTeams, [team.id]: { name: team.name } };
              });

              return team.roster.roster.map((player) => {
                return {
                  id: player.person.id,
                  name: player.person.fullName,
                  team: team.id,
                };
              });
            });

            setRawPlayers((previousPlayers) => [
              ...previousPlayers,
              ...formattedPlayers.flat(),
            ]);

            if (year + 1 === newestSeason) {
              setFetchComplete(true);
            }
          },
          (error) => {
            console.log(error);
          }
        );
    });
  }, []);

  useEffect(() => {
    if (fetchComplete) {
      setPlayers(() => {
        const tempPlayers = {};
        rawPlayers.forEach((player) => {
          const teams = tempPlayers[player.id]
            ? [...tempPlayers[player.id].teams, player.team]
            : [player.team];
          const uniqueTeams = new Set(teams);

          tempPlayers[player.id] = {
            name: player.name,
            teams: [...uniqueTeams],
          };
        });

        return tempPlayers;
      });
    }
  }, [fetchComplete]);

  const handleAddPlayer = (e) => {
    e.preventDefault();
  };

  useEffect(() => {
    if (search.length > 2) {
      setPossiblePlayers(() => {
        return Object.keys(players).filter((id) => {
          const nameMatches = players[id].name
            .toLowerCase()
            .includes(search.toLowerCase());
          return nameMatches && !selectedPlayers.includes(id);
        });
      });
    } else {
      setPossiblePlayers([]);
    }
  }, [search, selectedPlayers]);

  useEffect(() => {
    validateTeam();
  }, [selectedPlayers]);

  const validateTeam = () => {
    if (!selectedPlayers.length) {
      setErrors([]);
      return;
    }

    let errors = [];

    const teamsOfSelectedPlayers = selectedPlayers
      .map((id) => players[id].teams)
      .flat();
    const countriesOfSelectedPlayers = selectedPlayers.map(
      (id) => players[id].data.nationality
    );

    if (
      new Set(teamsOfSelectedPlayers).size !== teamsOfSelectedPlayers.length
    ) {
      errors.push('Two or more players have played on the same team.');
    }

    if (
      new Set(countriesOfSelectedPlayers).size !==
      countriesOfSelectedPlayers.length
    ) {
      errors.push('Two or more players have the same nationality.');
    }

    setErrors(errors);
  };

  const handlePlayerRemoval = (id) =>
    setSelectedPlayers((previousPlayers) =>
      previousPlayers.filter((pId) => pId !== id)
    );

  const fetchPlayer = (id) => {
    fetch(`https://statsapi.web.nhl.com/api/v1/people/${id}`)
      .then((res) => res.json())
      .then(
        ({ people }) => {
          console.log(people);
          setPlayers((previousPlayers) => {
            return {
              ...previousPlayers,
              [id]: { ...previousPlayers[id], data: { ...people[0] } },
            };
          });
          setSelectedPlayers((previousPlayers) => [...previousPlayers, id]);
        },
        (error) => {
          console.log(error);
        }
      );
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    addPlayer(possiblePlayers[0]);
  };

  const addPlayer = (id) => {
    fetchPlayer(id);
  };

  return (
    <div>
      <h1>Your Dream Team</h1>

      <Team
        players={selectedPlayers.map((id) => players[id])}
        handlePlayerRemoval={handlePlayerRemoval}
        teamData={teams}
      />

      {errors.map((error) => (
        <p style={{ color: 'red' }} key={error}>
          {error}
        </p>
      ))}

      <form onSubmit={handleFormSubmit}>
        <label htmlFor="player">Player name</label>
        <input
          type="text"
          name="player"
          id="player"
          onChange={(e) => setSearch(e.target.value)}
        />
      </form>

      {possiblePlayers &&
        possiblePlayers.map((id) => (
          <div key={id}>
            <Player {...players[id]} teamData={teams} />
            <button onClick={() => addPlayer(id)}>Add</button>
          </div>
        ))}
    </div>
  );
};
