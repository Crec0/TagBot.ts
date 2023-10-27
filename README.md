# TagBot

## Setup

* Create a bot account at https://discord.com/developers/applications
* Go to OAuth2 > URL Generator and generate a URL with the `application.commands` scope
* Invite the bot to your server
* Install the dependencies with `npm install`
* Create a `.env` file with the `DISCORD_TOKEN` property set
* Run the bot with `node run launch`

## Commands

### Tag Create

- Command: `tag create <tag_name> <message_id>`
- Description: Creates a new tag with the specified name and uses the contents of the referenced message as the tag
  content. Alternatively, you can right-click on a message and select the "Create Tag" option from the context menu to
  create a tag directly.
- Example:
    - Command: `tag create welcome 1234567890`
    - Context Menu: Right-click on a message and select "Create Tag"

### Tag Get

- Command: `tag get <tag_name> [ephemeral] [target]`
- Description: Retrieves the content of the specified tag. Optionally, you can include the `ephemeral` argument to make
  the response visible only to the user who executed the command. Additionally, you can mention a `target` user to ping
  them when retrieving the tag.
- Example:
    - `tag get welcome`
    - `tag get welcome ephemeral`
    - `tag get welcome ephemeral @username`

### Tag Update

- Command: `tag update <tag_name> <message_id>`
- Description: Updates the content of the specified tag using the contents of the referenced message.
- Example: `tag update welcome 0987654321`

### Tag Delete

- Command: `tag delete <tag_name>`
- Description: Deletes the specified tag.
- Example: `tag delete welcome`

### Tag List

- Command: `tag list [user] [unclaimed]`
- Description: Lists all the tags available in the current guild. Optionally, you can include the `user` parameter to
  only display tags owned by the specified user. Additionally, you can include the `unclaimed` parameter to list all the
  tags that are currently unclaimed (without an owner). If both specified, `user` parameter will be used.
- Example:
    - `tag list`
    - `tag list @username`
    - `tag list unclaimed`

### Tag Claim

- Command: `tag claim <tag_name>`
- Description: Claims ownership of the specified tag, if tag is unclaimed
- Example: `tag claim welcome`

### Tag Release

- Command: `tag release <tag_name>`
- Description: Releases ownership of the specified tag.
- Example: `tag release welcome`

### Tag Transfer

- Command: `tag transfer <tag_name> <new_owner>`
- Description: Transfers ownership of the specified tag to another user.
- Example: `tag transfer welcome @new_owner`
