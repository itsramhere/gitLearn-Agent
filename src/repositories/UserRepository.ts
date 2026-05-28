import { Db, ObjectId } from 'mongodb';

export class UserRepository {
  private db: Db;

  constructor(db: Db) {
    this.db = db;
  }

  /**
   * Fetches a student's profile including their concept map.
   */
  public async getStudentProfile(studentId: string) {
    const usersCollection = this.db.collection('users');
    const userDoc = await usersCollection.findOne({ _id: new ObjectId(studentId) });
    
    if (!userDoc) {
      throw new Error('Student not found in database');
    }
    
    return {
      userDoc,
      existingConceptMap: userDoc.conceptMap || {
        filesExplained: [],
        conceptsUnderstood: [],
        conceptsConfused: []
      }
    };
  }

  /**
   * Saves an interaction log and updates the concept map for a student.
   */
  public async saveInteraction(studentId: string, updatedConceptMap: any, sessionLogEntry: any) {
    const usersCollection = this.db.collection('users');
    
    await usersCollection.updateOne(
      { _id: new ObjectId(studentId) },
      {
        $set: { conceptMap: updatedConceptMap },
        $push: { sessionHistory: sessionLogEntry } as any
      }
    );
  }
}
