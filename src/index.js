import { copyPermissions } from './copy-permissions'

const masterNames = ['BaseRole / Staff', 'BaseRole / Student']
const delimiter = ' / '

export default ({filter, action}, {services}) => {
  const {ItemsService} = services

  async function getMasterRole (key, context) {
    const rolesService = new ItemsService('directus_roles', context)
    const source = await rolesService.readOne(key)
    if (masterNames.includes(source.name)) return source
    const suffix = source.name.split(delimiter).pop()
    const masterName = masterNames.find(name => name.endsWith(suffix))
    const masterRoles = await rolesService.readByQuery({
      filter: {name: masterName}
    })
    return masterRoles.find(role => role.name === masterName)
  }

  async function updateRole (key, context) {
    if (!key) return
    const rolesService = new ItemsService('directus_roles', context)
    const masterRole = await getMasterRole(key, context)
    if (masterRole) {
      const suffix = masterRole.name.split(delimiter).pop()
      const targetRoles = await rolesService.readByQuery({
        filter: {
          id: { _neq: masterRole.id },
          name: { _ends_with: suffix }
        }
      })
      for (const target of targetRoles) {
        if (target.name.endsWith(suffix)) {
          await copyPermissions({ source: masterRole, target, ItemsService }, context)
        }
      }
    }
  }

  action('permissions.create', async ({payload, key}, context) => {
    await updateRole(payload.role, context)
  })
  action('permissions.update', async ({payload, keys}, context) => {
    for (const key of keys) {
      await updateRole(payload.role, context)
    }
  })
  filter('permissions.delete', async (keys, meta, context) => {
    Object.defineProperty(keys, '_roles', { value: [], enumerable: false, writable: true } )
    for (const key of keys) {
      const permissionsService = new ItemsService('directus_permissions', context)
      const permission = await permissionsService.readOne(key)
      if (permission) keys._roles.push(permission.role)
    }
    return keys
  })
  action('permissions.delete', async ({keys}, context) => {
    for (const role of keys._roles) {
      await updateRole(role, context)
    }
  })
}
