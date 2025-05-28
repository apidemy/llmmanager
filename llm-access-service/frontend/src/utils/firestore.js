// llm-access-service/frontend/src/utils/firestore.js
import { db } from '../firebaseConfig'; // Import your Firestore instance

// Function to create a user document in Firestore upon successful signup
export const createUserProfile = async (userId, email) => {
    try {
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) {
            // Only create if document does not exist
            await userRef.set({
                userId: userId,
                email: email,
                apiKey: null, // API key will be generated later
                freeCallsToday: 0, // Initialize free calls
                lastFreeCallDate: null, // Initialize last free call date
                balance: 0, // Initialize balance
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("User profile created successfully for user:", userId);
        } else {
             console.log("User profile already exists for user:", userId);
        }

    } catch (error) {
        console.error("Error creating user profile:", error);
        throw error; // Re-throw to be handled by calling code
    }
};


// Function to get a user's profile from Firestore
export const getUserProfile = async (userId) => {
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        } else {
            console.log("No such user profile for user:", userId);
            return null;
        }
    } catch (error) {
        console.error("Error getting user profile:", error);
        throw error;
    }
};

// Function to get billing records for a user
export const getUserBillingRecords = async (userId) => {
    try {
        // Ensure db is initialized
        if (!db) {
             console.error("Firestore database is not initialized.");
             return [];
        }

        const snapshot = await db.collection('billing')
            .where('user_id', '==', userId)
            .orderBy('timestamp', 'desc') // Assuming 'timestamp' field exists and is indexed
            .get();

        const records = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        return records;
    } catch (error) {
        console.error("Error fetching user billing records:", error);
        // Check if the error is due to missing index and provide guidance
        if (error.code === 'failed-precondition') {
             console.error("Firestore Error: You might need to create an index for 'user_id' and 'timestamp' in the 'billing' collection.");
        }
        throw error; // Re-throw to be handled by the calling component
    }
};

// You would add functions here later to update user balance, etc.
