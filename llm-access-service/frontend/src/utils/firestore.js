// llm-access-service/frontend/src/utils/firestore.js
import { firestore } from '../firebaseConfig';
import firebase from 'firebase/app';
import 'firebase/firestore';

/**
 * Adds a new user document to the 'users' collection.
 * @param {string} userId - The Firebase Authentication user ID.
 * @param {string} email - The user's email address.
 * @param {string} apiKey - The LiteLLM virtual API key associated with the user.
 * @returns {Promise<void>}
 */
export const createUserProfile = async (userId, email, apiKey) => {
  try {
    await firestore.collection('users').doc(userId).set({
      userId: userId,
      email: email,
      apiKey: apiKey,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("User profile created successfully!");
  } catch (error) {
    console.error("Error creating user profile: ", error);
    throw error; // Re-throw the error for handling in the calling component
  }
};

/**
 * Retrieves a user document from the 'users' collection.
 * @param {string} userId - The Firebase Authentication user ID.
 * @returns {Promise<object|null>} - The user profile data or null if not found.
 */
export const getUserProfile = async (userId) => {
  try {
    const doc = await firestore.collection('users').doc(userId).get();
    if (doc.exists) {
      console.log("User profile data:", doc.data());
      return doc.data();
    } else {
      console.log("No such user profile!");
      return null;
    }
  } catch (error) {
    console.error("Error getting user profile: ", error);
    throw error; // Re-throw the error
  }
};

/**
 * Adds a new billing document to the 'billing' collection.
 * @param {string} userId - The Firebase Authentication user ID.
 * @param {string} model - The name of the LLM model used.
 * @param {number} inputTokens - The number of input tokens used.
 * @param {number} outputTokens - The number of output tokens generated.
 * @param {number} cost - The calculated cost for the usage.
 * @returns {Promise<void>}
 */
export const addBillingRecord = async (userId, model, inputTokens, outputTokens, cost) => {
  try {
    await firestore.collection('billing').add({
      userId: userId,
      model: model,
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      cost: cost,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log("Billing record added successfully!");
  } catch (error) {
    console.error("Error adding billing record: ", error);
    throw error; // Re-throw the error
  }
};

/**
 * Retrieves billing documents for a specific user from the 'billing' collection, ordered by timestamp.
 * @param {string} userId - The Firebase Authentication user ID.
 * @returns {Promise<Array<object>>} - An array of billing records.
 */
export const getUserBillingRecords = async (userId) => {
  try {
    const snapshot = await firestore.collection('billing')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .get();

    const records = [];
    snapshot.forEach(doc => {
      records.push({ id: doc.id, ...doc.data() });
    });
    console.log("User billing records:", records);
    return records;
  } catch (error) {
    console.error("Error getting billing records: ", error);
    throw error; // Re-throw the error
  }
};