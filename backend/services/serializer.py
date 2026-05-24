def individual_users(user):
    return{
        "id":str(user["_id"]),
        "username": user["username"]
    }

def list_users(users)->list:
    return [individual_users(user) for user in users]
