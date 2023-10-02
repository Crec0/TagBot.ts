# TagBot

## Setup

* Create a bot account at https://discord.com/developers/applications
* Go to OAuth2 > URL Generator and generate a URL with the `application.commands` scope
* Invite the bot to your server
* Install the dependencies with `npm install`
* Create a `.env` file with the `DISCORD_TOKEN` property set
* Run the bot with `node index.ts`

## Commands

### Tag Create
- Command: `tag create <tag_name> <message_id>`
- Description: Creates a new tag with the specified name and uses the contents of the referenced message as the tag content. Alternatively, you can right-click on a message and select the "Create Tag" option from the context menu to create a tag directly.
- Example:
    - Command: `tag create welcome 1234567890`
    - Context Menu: Right-click on a message and select "Create Tag"

### Tag List
- Command: `tag list`
- Description: Lists all the tags available in the current guild.
- Example: `tag list`

### Tag Get
- Command: `tag get <tag_name> [ephemeral] [target]`
- Description: Retrieves the content of the specified tag. Optionally, you can include the `ephemeral` argument to make the response visible only to the user who executed the command. Additionally, you can mention a `target` user to ping them when retrieving the tag.
- Example:
    - `tag get welcome`
    - `tag get welcome ephemeral`
    - `tag get welcome ephemeral @username`

### Tag Delete
- Command: `tag delete <tag_name>`
- Description: Deletes the specified tag.
- Example: `tag delete welcome`

### Tag Update
- Command: `tag update <tag_name> <message_id>`
- Description: Updates the content of the specified tag using the contents of the referenced message.
- Example: `tag update welcome 0987654321`

### Tag Claim (Future Plan)
- Command: `tag claim <tag_name>`
- Description: Claims ownership of the specified tag.
- Example: `tag claim welcome`

### Tag Unclaim (Future Plan)
- Command: `tag unclaim <tag_name>`
- Description: Releases ownership of the specified tag.
- Example: `tag unclaim welcome`

### Tag Transfer (Future Plan)
- Command: `tag transfer <tag_name> <new_owner>`
- Description: Transfers ownership of the specified tag to another user.
- Example: `tag transfer welcome @new_owner`
