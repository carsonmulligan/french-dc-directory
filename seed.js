const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database('./database.sqlite');

// Import the resources data
const frenchDCResources = {
  // ... your data object from above ...
};

function seedDatabase() {
  // Helper function to insert a resource
  const insertResource = (type, resource) => {
    return new Promise((resolve, reject) => {
      const locations = Array.isArray(resource.locations) 
        ? JSON.stringify(resource.locations)
        : JSON.stringify([resource.location || {}]);

      const description = typeof resource.description === 'string' 
        ? resource.description 
        : JSON.stringify({
            features: resource.features || resource.eventTypes || resource.offerings || [],
            levels: resource.levels || [],
            schedule: resource.schedule || {},
            programDetails: resource.programDetails || {}
          });

      db.run(
        `INSERT INTO resources (type, name, website, locations, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [type, resource.name, resource.website, locations, description],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  };

  // Begin transaction
  db.serialize(async () => {
    try {
      // Clear existing data
      db.run("DELETE FROM comments");
      db.run("DELETE FROM resources");
      
      // Seed language schools
      console.log('Seeding language schools...');
      for (const school of frenchDCResources.languageSchools) {
        await insertResource('language_school', school);
      }

      // Seed community groups
      console.log('Seeding community groups...');
      for (const group of frenchDCResources.communityGroups) {
        await insertResource('community_group', group);
      }

      // Seed cultural events
      console.log('Seeding cultural events...');
      for (const event of frenchDCResources.culturalEvents) {
        await insertResource('cultural_event', event);
      }

      // Seed online resources
      console.log('Seeding online resources...');
      for (const resource of frenchDCResources.onlineResources) {
        await insertResource('online_resource', resource);
      }

      // Seed recurring events from calendar
      console.log('Seeding recurring events...');
      for (const event of frenchDCResources.calendar.recurringEvents) {
        await insertResource('recurring_event', {
          name: event.name,
          website: 'N/A',
          description: JSON.stringify(event)
        });
      }

      // Seed annual events from calendar
      console.log('Seeding annual events...');
      for (const event of frenchDCResources.calendar.annualEvents) {
        await insertResource('annual_event', {
          name: event.name,
          website: 'N/A',
          description: JSON.stringify(event)
        });
      }

      console.log('Database seeding completed successfully!');
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  });
}

// Run the seeding
seedDatabase();