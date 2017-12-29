const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { Context, getUserId } = require('./utils')

// resolve the `AuthPayload` type
const AuthPayload = {
  user: async ({ user: { id } }, args, ctx, info) => {
    return ctx.db.query.user({ where: { id } }, info)
  },
}

// query the currently logged in user
function me(parent, args, ctx, info) {
  const id = getUserId(ctx)
  return ctx.db.query.user({ where: { id } }, info)
}

// register a new user
async function signup(parent, args, ctx, info) {
  const password = await bcrypt.hash(args.password, 10)
  const role = args.admin ? 'ADMIN' : 'CUSTOMER'

  delete args.admin
  const user = await ctx.db.mutation.createUser({
    data: { ...args, role, password },
  })

  return {
    token: jwt.sign({ userId: user.id }, process.env.JWT_SECRET),
    user,
  }
}

// log in an existing user
async function login(parent, { email, password }, ctx, info) {
  const user = await ctx.db.query.user({ where: { email } })
  if (!user) {
    throw new Error(`No such user found for email: ${email}`)
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    throw new Error('Invalid password')
  }

  return {
    token: jwt.sign({ userId: user.id }, process.env.JWT_SECRET),
    user,
  }
}

// update the password of an existing user
async function updatePassword(
  parent,
  { oldPassword, newPassword, userId },
  ctx,
  info,
) {
  console.log(`updatePassword`, oldPassword, newPassword, userId)
  if (!userId) {
    // a user updates her own password
    const user = await ctx.db.query.user({ where: { id: getUserId(ctx) } })
    console.log(`update user: `, JSON.stringify(user))
    const oldPasswordValid = await bcrypt.compare(oldPassword, user.password)
    console.log(`oldPasswordValid: `, oldPasswordValid)
    if (!oldPasswordValid) {
      throw new Error(
        'Old password was wrong, please try again or contact an admin to reset your password',
      )
    }
    const newPasswordHash = await bcrypt.hash(newPassword, 10)
    try {
      await ctx.db.mutation.updateUser({
        where: { id: userId },
        data: { password: newPasswordHash },
      })
    } catch (e) {
      return e
    }
    return user
  } else {
    // a user updates the password of another user -> must be an admin
    const requestingUserId = getUserId(ctx)
    const userIsAdmin = ctx.db.exists.user({
      id: requestingUserId,
      role: 'ADMIN',
    })
    const user = await ctx.db.query.user({ where: { id: userId } })
    const newPasswordHash = await bcrypt.hash(newPassword, 10)
    try {
      await ctx.db.mutation.updateUser({
        where: { id: userId },
        data: { password: newPasswordHash },
      })
    } catch (e) {
      return e
    }
    console.log(`return user: `, JSON.stringify(user))
    return user
  }

// async function updatePasswordForUser(id, newPassword) {
//   const newPasswordHash = await bcrypt.hash(newPassword, 10)
//   await ctx.db.mutation.updateUser({
//     where: { id: userId },
//     data: { password: newPasswordHash },
//   })
// }

  const user = await ctx.db.query.user({ where: { id } })

  const userExistsAndIsAdmin = ctx.db.exists.user({
    where: { id, role: 'ADMIN' },
  })
  console.log(`userExistsAndIsAdmin: `, userExistsAndIsAdmin)
  if (userExistsAndIsAdmin) {
  } else {
  }
}

module.exports = {
  me,
  signup,
  login,
  updatePassword,
  AuthPayload,
}
