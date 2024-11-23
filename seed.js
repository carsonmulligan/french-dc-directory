const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

const frenchDCResources = {
  languageSchools: [
    {
      id: 1,
      name: "French Academy DC",
      website: "https://www.frenchacademy.us/",
      locations: [
        {
          name: "Farragut Square",
          type: "Adult Classes",
          city: "Washington",
          state: "DC"
        },
        {
          name: "Chevy Chase",
          type: "Kids Classes",
          city: "Washington",
          state: "DC"
        },
        {
          name: "Alexandria",
          type: "Adult and Kids Classes",
          state: "VA"
        }
      ],
      levels: ["A1", "A2", "B1", "B2+"],
      classTypes: ["In-person", "Online"],
      onlinePlatforms: ["Zoom", "Skype", "Microsoft Teams"]
    },
    {
      id: 2,
      name: "International Language Institute of DC (ILI)",
      website: "https://ilidc.com/flp/frenchclass/",
      location: {
        area: "Downtown Washington",
        state: "DC"
      },
      levels: [
        "Beginner",
        "Elementary",
        "Intermediate",
        "Upper Intermediate",
        "Advanced"
      ]
    },
    {
      id: 3,
      name: "Alliance Française de Washington DC",
      website: "https://francedc.org/adult-learning",
      location: {
        city: "Washington",
        state: "DC"
      },
      offerings: [
        {
          type: "Private Lessons",
          format: "One-on-one instruction"
        },
        {
          type: "Semi-private Lessons",
          format: "Small group instruction"
        }
      ]
    }
  ],
  
  communityGroups: [
    {
      id: 1,
      name: "DC Language Exchange",
      website: "https://www.meetup.com/dc-language-exchange/",
      description: "Organizes language exchange events for various languages, including French",
      features: ["Weekly meetups", "All levels welcome", "Native speakers"]
    },
    {
      id: 2,
      name: "French Conversation Meetup Group",
      website: "https://www.meetup.com/french-conversation-meetup-group/",
      description: "Regular meetups for French language practice",
      features: ["Native speakers", "All levels welcome", "Structured conversation practice"]
    }
  ],

  culturalEvents: [
    {
      id: 1,
      name: "Francophonie Cultural Festival",
      website: "https://www.francophonie-dc.org/",
      description: "Annual festival celebrating French language and Francophone cultures",
      features: [
        "Art exhibitions",
        "Film screenings",
        "Cultural performances",
        "Food tastings"
      ]
    }
  ],

  onlineResources: [
    {
      id: 1,
      name: "TV5MONDE",
      website: "https://apprendre.tv5monde.com/",
      type: "Learning Platform",
      features: [
        "Free French lessons",
        "News in French",
        "Interactive exercises",
        "Cultural content"
      ],
      levels: ["A1", "A2", "B1", "B2", "C1"]
    },
    {
      id: 2,
      name: "RFI Savoirs",
      website: "https://savoirs.rfi.fr/",
      type: "Media Resource",
      features: [
        "Daily news in French",
        "Learning exercises",
        "Podcasts",
        "Transcripts"
      ],
      levels: ["Beginner", "Intermediate", "Advanced"]
    }
  ],

  youtubeVideos: [
    {
      title: "French Lesson 1: Basic French Phrases",
      video_id: "DH-X8NeM6TM",
      description: "Learn essential French phrases for beginners"
    },
    {
      title: "French Pronunciation",
      video_id: "yEyGp-3t8T4",
      description: "Master French pronunciation with this guide"
    },
    {
      title: "French Numbers 1-100",
      video_id: "RkGYDJtlZWI",
      description: "Learn to count in French"
    }
  ]
};

function seedDatabase() {
    // Convert locations array to string for storage
    const formatLocations = (locations) => {
        if (Array.isArray(locations)) {
            return locations.map(loc => {
                if (typeof loc === 'string') return loc;
                return `${loc.name || loc.area || ''}, ${loc.state || ''}`.trim();
            }).join('; ');
        }
        if (locations && locations.area) {
            return `${locations.area}, ${locations.state}`;
        }
        return '';
    };

    // Format description from object data
    const createDescription = (resource) => {
        let description = '';
        
        if (resource.levels) {
            description += `Levels: ${Array.isArray(resource.levels) ? resource.levels.join(', ') : resource.levels}. `;
        }
        
        if (resource.classTypes) {
            description += `Class Types: ${resource.classTypes.join(', ')}. `;
        }
        
        if (resource.features) {
            description += `Features: ${resource.features.join(', ')}. `;
        }
        
        if (resource.eventTypes) {
            description += `Event Types: ${resource.eventTypes.join(', ')}. `;
        }
        
        if (resource.offerings) {
            const offeringDesc = Array.isArray(resource.offerings) 
                ? resource.offerings.map(o => typeof o === 'string' ? o : o.type).join(', ')
                : resource.offerings;
            description += `Offerings: ${offeringDesc}. `;
        }

        return description || resource.description || '';
    };

    // Insert Language Schools
    frenchDCResources.languageSchools.forEach(school => {
        db.run(
            "INSERT INTO resources (type, name, website, locations, description) VALUES (?, ?, ?, ?, ?)",
            [
                'language_school',
                school.name,
                school.website,
                formatLocations(school.locations),
                createDescription(school)
            ]
        );
    });

    // Insert Community Groups
    frenchDCResources.communityGroups.forEach(group => {
        db.run(
            "INSERT INTO resources (type, name, website, description) VALUES (?, ?, ?, ?)",
            [
                'community_group',
                group.name,
                group.website,
                createDescription(group)
            ]
        );
    });

    // Insert Cultural Events
    frenchDCResources.culturalEvents.forEach(event => {
        db.run(
            "INSERT INTO resources (type, name, website, description) VALUES (?, ?, ?, ?)",
            [
                'cultural_event',
                event.name,
                event.website,
                createDescription(event)
            ]
        );
    });

    // Insert Online Resources
    frenchDCResources.onlineResources.forEach(resource => {
        db.run(
            "INSERT INTO resources (type, name, website, description) VALUES (?, ?, ?, ?)",
            [
                'online_resource',
                resource.name,
                resource.website,
                createDescription(resource)
            ]
        );
    });

    // Insert YouTube videos
    frenchDCResources.youtubeVideos.forEach(video => {
        db.run(
            "INSERT INTO youtube_videos (title, video_id, description) VALUES (?, ?, ?)",
            [video.title, video.video_id, video.description]
        );
    });

    console.log('Database seeded!');
}

// Clear existing data and seed
db.serialize(() => {
    // Clear all tables
    db.run("DELETE FROM resources", [], (err) => {
        if (err) console.error('Error clearing resources:', err);
        console.log('Existing resources cleared');
    });
    
    db.run("DROP TABLE IF EXISTS youtube_videos", [], (err) => {
        if (err) console.error('Error dropping youtube_videos table:', err);
    });

    // Create youtube_videos table
    db.run(`CREATE TABLE IF NOT EXISTS youtube_videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        video_id TEXT,
        description TEXT,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, [], (err) => {
        if (err) {
            console.error('Error creating youtube_videos table:', err);
            return;
        }
        console.log('YouTube videos table created');
        
        // Now seed the database
        seedDatabase();
    });
});

// Close the database connection after a delay to ensure all insertions complete
setTimeout(() => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
            return;
        }
        console.log('Database connection closed');
    });
}, 2000);