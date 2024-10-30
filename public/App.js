// setting up socket connection
const socket = io();

function App() {
  // managing mood state
  const [mood, setMood] = React.useState({
    level: 50,
    recentInteractions: [],
  });

  React.useEffect(() => {
    socket.on("moodUpdate", (newMood) => {
      setMood(newMood);
    });

    return () => {
      socket.off("moodUpdate");
    };
  }, []);

  // determining mood color based on level
  const getMoodColor = () => {
    if (mood.level <= 10) return "#ff4444"; // Red
    if (mood.level <= 40) return "#ffbb33"; // Yellow
    return "#00C851"; // Green
  };

  // determining mood state based on level
  const getMoodState = () => {
    if (mood.level >= 70) return "happy";
    if (mood.level >= 30) return "neutral";
    return "sad";
  };

  // handling user interactions
  const handleInteraction = (action) => {
    socket.emit("interaction", action);
  };

  const RecentInteractions = ({ interactions }) => {
    if (!interactions || interactions.length === 0) {
      return <p>No recent interactions</p>;
    }

    return (
      <ul>
        {interactions.map((interaction, index) => (
          <li key={`${interaction.timestamp}-${index}`}>
            {interaction.action} at{" "}
            {new Date(interaction.timestamp).toLocaleTimeString()}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="main-container">
      <div className="critter-container">
        <h1>Lil Critter</h1>
        <div className={`critter ${getMoodState()}`}></div>
        <div className="progress-container">
          <div
            className="progress-bar"
            style={{
              "--progress": `${mood.level}%`,
              "--bar-color": getMoodColor(),
            }}
          >
            <span className="progress-text">{Math.round(mood.level)}%</span>
          </div>
        </div>
        <div className="controls">
          <button onClick={() => handleInteraction("feed")}>Feed</button>
          <button onClick={() => handleInteraction("pet")}>Pet</button>
          <button onClick={() => handleInteraction("gift")}>Give Gift</button>
        </div>
        <div className="recent-interactions">
          <h3>Recent Interactions</h3>
          <RecentInteractions interactions={mood.recentInteractions} />
        </div>
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
