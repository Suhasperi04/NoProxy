// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDSQQGX15UhgG-5sH3W2v7VJATYIWe6NVI",
    authDomain: "attendance-17c2f.firebaseapp.com",
    databaseURL: "https://attendance-17c2f-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "attendance-17c2f",
    storageBucket: "attendance-17c2f.appspot.com",
    messagingSenderId: "37428201197",
    appId: "1:37428201197:web:dba34a71ee5dbb03fbaee4",
    measurementId: "G-EHB94XW83H"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

document.getElementById('registrationForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const id = document.getElementById('id').value;
    const name = document.getElementById('name').value;
    const age = document.getElementById('age').value;
    const email = document.getElementById('email').value;

    const tid = parseInt(id, 10); // Convert ID to an integer

    // Update Firebase to set registration mode
    try {
        await database.ref().update({
            registerID: tid,
            registerMode: true
        });

        console.log("Registration mode activated in Firebase for ID:", tid);

        // Listen for success response from ESP32
        const successListener = database.ref().on('value', async (snapshot) => {
            const success = snapshot.val();
            if (success.success) {
                console.log("Registration successful on ESP32, storing user details in MongoDB...");

                // Store the user details in MongoDB
                const response = await fetch('/api/users/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: tid, name, age, email })
                });

                if (response.status === 201) {
                    alert('User registered successfully');
                } else {
                    alert('Error registering user');
                }

                // Reset Firebase registerMode and success values
                await database.ref().update({
                    registerMode: false,
                    success: false
                });

                // Remove the listener after success
                database.ref().off('value', successListener);
            }
        });

    } catch (error) {
        console.error("Error during registration process:", error);
        alert('Failed to start registration process');
    }
});




// Set default date to today
document.getElementById('logDate').value = new Date().toISOString().split('T')[0];

// Fetch logs when the date changes
document.getElementById('logDate').addEventListener('change', function () {
    const selectedDate = this.value;
    fetchLogsForDate(selectedDate);
});

// Fetch logs for today's date on page load
fetchLogsForDate(document.getElementById('logDate').value);

async function fetchLogsForDate(date) {
    console.log("Fetching logs for date:", date);

    try {
        const response = await fetch(`/api/users/${date}`);

        if (!response.ok) {
            throw new Error(`Error fetching logs: ${response.statusText}`);
        }

        const logs = await response.json();

        document.getElementById('userLog').innerHTML = ''; // Clear existing logs

        if (logs.length === 0) {
            document.getElementById('userLog').innerHTML = '<p>No logs found for this date.</p>';
        } else {
            logs.forEach(log => {
                document.getElementById('userLog').innerHTML += `<p>${log.name} - ${new Date(log.timestamp).toLocaleString()}</p>`;
            });
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        document.getElementById('userLog').innerHTML = '<p>No attendance taken This day</p>';
    }
}

// Listen for changes in Firebase and fetch logs when needed
database.ref().on('value', async (snapshot) => {
    const data = snapshot.val();
    console.log("Firebase data:", data);

    if (data.value === true) {
        try {
            // Change the value in Firebase to false
            await database.ref().update({ value: false });

            // Call the function to check the user in MongoDB and update logs
            await checkUser(data.id);

            // Fetch and display logs for the current date
            fetchLogsForDate(new Date().toISOString().split('T')[0]);
        } catch (error) {
            console.error('Error processing Firebase data:', error);
            alert('An error occurred while processing the Firebase update.');
        }
    }
});

async function checkUser(id) {
    try {
        const response = await fetch('/api/users/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (response.ok) {
            const logEntry = await response.json();
            console.log("Log entry:", logEntry);

            fetchLogsForDate(new Date().toISOString().split('T')[0]);
        } else if (response.status === 404) {
            alert('User not found.');
        } else {
            alert('User not found or not active');
        }
    } catch (error) {
        console.error('Error:', error.message);
        alert('Could not process the request. Please try again.');
    }
}
